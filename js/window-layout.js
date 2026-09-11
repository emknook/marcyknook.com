// Percentages refer to the desktop area left over after the taskbar.
function windowPercentage(value, extent, fallback, legacyBorder = 0) {
    const number = parseFloat(value);
    if (!Number.isFinite(number)) return fallback;
    const percent = String(value).endsWith('%')
        ? number : ((number + legacyBorder) / Math.max(1, extent)) * 100;
    return `${Number(percent.toFixed(6))}%`;
}

function migrateWindowLayouts() {
    const desktop = document.querySelector('.window');
    settings.appSettings ??= [];
    settings.appSettings.forEach(app => {
        // Old pixel dimensions described the content; new dimensions include borders.
        app.x = windowPercentage(app.x, desktop.clientWidth, '20%');
        app.y = windowPercentage(app.y, desktop.clientHeight, '15%');
        app.width = windowPercentage(app.width, desktop.clientWidth, '70%', borderSize);
        app.height = windowPercentage(app.height, desktop.clientHeight, '70%', borderSize);
    });
}

function applyWindowLayout(app, layout) {
    app.style.left = layout.x;
    app.style.top = layout.y;
    app.style.width = layout.width;
    app.style.height = layout.height;
}

function displayWindowPercentage(value) {
    return `${Math.round(parseFloat(value))}%`;
}

function rememberMaximizedLayout(app, maximize) {
    const saved = getAppSettings(app.id);
    if (!saved) return;
    if (maximize && !saved.maximized) {
        saved.restoreBounds = { x: saved.x, y: saved.y, width: saved.width, height: saved.height };
    }
    saved.maximized = maximize;
    if (!maximize) delete saved.restoreBounds;
}

function toggleMaximizedWindow(app) {
    const saved = getAppSettings(app.id);
    if (saved?.maximized && saved.restoreBounds) {
        const previous = { ...saved.restoreBounds };
        rememberMaximizedLayout(app, false);
        updateApp(app.id, previous.x, previous.y, previous.height, previous.width, app.style.zIndex);
        saveSettings();
    } else {
        snapWindowToZone(app, 'full');
    }
}

function syncWindowControls() {
    appElements.forEach(app => {
        const button = app.querySelector('.fullsize-button');
        const maximized = !!getAppSettings(app.id)?.maximized;
        button.textContent = maximized ? '❐' : '□';
        button.title = maximized ? 'Restore previous size' : 'Maximise';
        button.setAttribute('aria-label', maximized ? 'Restore previous window size' : 'Maximise window');
        button.setAttribute('aria-pressed', String(maximized));
    });
}
