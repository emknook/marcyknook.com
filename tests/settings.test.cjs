const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../js/script.js'), 'utf8');

function desktop(storage) {
    const status = { textContent: '', hidden: true };
    const element = {
        children: [],
        addEventListener() {},
        setAttribute() {},
        querySelectorAll: () => [],
        style: {},
    };
    const apps = [{ ...element, id: 'app0' }, { ...element, id: 'notes' }];
    const context = vm.createContext({
        localStorage: storage,
        document: {
            querySelector: () => element,
            querySelectorAll: selector => selector === '.app-content' ? apps : [],
            getElementById: id => id === 'settings-storage-status' ? status : element,
            addEventListener() {},
        },
        window: { addEventListener() {}, matchMedia: () => ({ matches: false }) },
        setInterval() {},
        clearInterval() {},
        initialized: [],
        opened: [],
        refreshed: 0,
    });
    vm.runInContext(source, context);
    // Replace rendering and unrelated app setup, retaining real startup and persistence.
    vm.runInContext(`
        addWindowResizeHandles = () => {};
        applyTaskbarPosition = () => {};
        migrateWindowLayouts = () => {};
        openApp = id => { opened.push(id); saveSettings(); };
        syncTaskbar = () => {};
        syncWindowControls = () => {};
        fillSettingBlocks = () => { refreshed++; };
        initializeMusic = () => initialized.push('music');
        initializeNotes = () => initialized.push('notes');
        initializeStyleSettings = () => initialized.push('style');
        initializeTaskbarSettings = () => initialized.push('taskbar');
        initializeDesktopIcons = () => initialized.push('icons');
        resetBackground = () => {};
        applyBackgroundFit = () => {};
        closeApp = () => {};
        layoutDesktopIcons = () => {};
    `, context);
    return { context, status, run: code => vm.runInContext(code, context) };
}

for (const raw of ['{', 'null', '[]', '{}', '{"openApps":{}}',
    '{"openApps":[],"appSettings":[null]}',
    '{"openApps":[],"appSettings":{}}',
    '{"openApps":[],"desktopPositions":null}']) {
    test(`Invalid preferences do not stop startup or overwrite storage: ${raw}`, () => {
        let writes = 0;
        const app = desktop({ getItem: () => raw, setItem: () => writes++ });
        app.run('loadSettings()');
        assert.equal(app.context.initialized.length, 5);
        assert.equal(app.context.opened[0], 'app0');
        assert.equal(writes, 0);
        assert.equal(app.status.hidden, false);
    });
}

test('Blocked storage reads do not stop startup', () => {
    const app = desktop({ getItem() { throw new Error('SecurityError'); } });
    app.run('loadSettings()');
    assert.equal(app.context.initialized.length, 5);
    assert.equal(app.run('saveSettings()'), false);
});

test('New visitors receive defaults without resetting their background', () => {
    let saved;
    const app = desktop({ getItem: () => null, setItem: (_, value) => { saved = JSON.parse(value); } });
    app.run('resetBackground = () => { throw new Error("Unexpected reset"); }; loadSettings()');
    assert.deepEqual(saved.openApps, ['app0']);
    assert.equal(app.status.hidden, true);
});

test('Valid preferences survive startup and unknown app IDs are removed', () => {
    let saved;
    const preferences = { openApps: ['notes', 'notes', 'removed'],
        appSettings: [{ name: 'notes', x: '12%', highScore: 5 }], taskbarPosition: 'bottom' };
    const app = desktop({ getItem: () => JSON.stringify(preferences),
        setItem: (_, value) => { saved = JSON.parse(value); } });
    app.run('loadSettings()');
    assert.deepEqual(saved.openApps, ['notes']);
    assert.deepEqual(saved.appSettings, preferences.appSettings);
    assert.equal(saved.taskbarPosition, 'bottom');
});

test('Failed writes allow initialization and UI refresh, then recover on a later save', () => {
    let full = true;
    const app = desktop({ getItem: () => null, setItem() { if (full) throw new Error('QuotaExceededError'); } });
    app.run('loadSettings()');
    assert.equal(app.context.initialized.length, 5);
    assert.ok(app.context.refreshed > 0);
    assert.equal(app.status.hidden, false);
    full = false;
    assert.equal(app.run('saveSettings()'), true);
    assert.equal(app.status.hidden, true);
});

test('Explicit reset enables persistence after an unreadable saved record', () => {
    let saved;
    const app = desktop({ getItem: () => '{', setItem: (_, value) => { saved = JSON.parse(value); } });
    app.run('loadSettings(); resetSettings()');
    assert.deepEqual(saved.openApps, ['app0']);
    assert.equal(app.status.hidden, true);
});
