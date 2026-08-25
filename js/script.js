const STORAGE_KEY = 'marcyDesktopSettings';
const LEGACY_STORAGE_KEY = 'userSettings';
const SETTINGS_VERSION = 2;

const windowMarginY = 30;
const windowMarginX = 50;
const navbarWidth = 52;
const borderSize = 4;

let appDefinitions = [];
let settings;
let navItems = [];
let appElements = [];
let topBars = [];
let snapOverlay;

let currentlyResizing;
let currentlyDragging;
let currentlyClosing = false;
let isDragging = false;
let isSuggesting = false;
let snapArea = '';
let startX;
let startY;
let startWidth;
let startHeight;
let startPosLeft;
let startPosTop;
let offsetX;
let offsetY;
let handleMouseMoveDrag;
let handleTouchMoveDrag;
let handleMouseMoveResize;
let handleTouchMoveResize;
let handleTouchSnappingZone;
let handleMouseSnappingZone;

const snapZones = [
    { name: 'top-left', x: 0, y: 0, width: 0.5, height: 0.5 },
    { name: 'top-right', x: 0.5, y: 0, width: 0.5, height: 0.5 },
    { name: 'bottom-left', x: 0, y: 0.5, width: 0.5, height: 0.5 },
    { name: 'bottom-right', x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
    { name: 'left-half', x: 0, y: 0, width: 0.5, height: 1 },
    { name: 'right-half', x: 0.5, y: 0, width: 0.5, height: 1 },
    { name: 'top-half', x: 0, y: 0, width: 1, height: 0.5 },
    { name: 'bottom-half', x: 0, y: 0.5, width: 1, height: 0.5 },
    { name: 'full', x: 0, y: 0, width: 1, height: 1 },
];

const settingsMigrations = {
    1: oldSettings => ({
        version: 2,
        theme: oldSettings.theme ?? 'dark',
        fontSize: oldSettings.fontSize ?? 'large',
        openApps: oldSettings.openApps ?? [],
        windows: Object.fromEntries(
            (oldSettings.appSettings ?? []).map(app => [
                app.name,
                {
                    x: app.x,
                    y: app.y,
                    width: app.width,
                    height: app.height,
                    z: app.z,
                    highScore: app.highScore,
                },
            ]),
        ),
        highestZ: Number(oldSettings.highestZ) || 1,
    }),
};

async function initialiseDesktop() {
    try {
        const response = await fetch('data/apps.json');
        if (!response.ok) {
            throw new Error(`Could not load apps.json: ${response.status}`);
        }

        const appData = await response.json();
        appDefinitions = appData.apps;
        renderDesktop();
        loadSettings();
        bindDesktopEvents();
        initialiseCarousel();

        // snake.js expects its container to exist, so load it only after rendering the JSON.
        await import('./snake.js');
    } catch (error) {
        console.error(error);
        document.getElementById('window').innerHTML =
            '<p class="load-error">The desktop could not be loaded. Please refresh the page.</p>';
    }
}

function renderDesktop() {
    const nav = document.getElementById('nav-pane');
    const desktop = document.getElementById('window');

    for (const app of appDefinitions) {
        nav.insertAdjacentHTML(
            'beforeend',
            `<button class="nav-item ${app.color}" type="button" data-target="${app.id}">
                <span class="label">${app.navLabel}</span>
                <span class="icon" aria-hidden="true">${app.icon}</span>
            </button>`,
        );

        const windowElement = document.createElement('section');
        windowElement.className = `app-content resizable ${app.color}`;
        windowElement.id = app.id;
        windowElement.innerHTML = `
            <div class="topBar bg-${app.color}">
                <div class="resize-button" aria-label="Resize">↖</div>
                <div class="fullsize-button" aria-label="Maximise">▢</div>
                <div class="title-bar">${app.title}</div>
                <div class="close-button" aria-label="Close">X</div>
            </div>
            <div class="${app.contentClass ?? 'scrollwrapper'}" data-app-content></div>
        `;

        // apps.json is a trusted, shipped content source. Sanitize here first if it ever
        // becomes editable by untrusted users.
        windowElement.querySelector('[data-app-content]').innerHTML = app.content.html;
        desktop.insertBefore(windowElement, document.getElementById('snap-suggestion'));
    }

    navItems = Array.from(document.querySelectorAll('.nav-item'));
    appElements = Array.from(document.querySelectorAll('.app-content'));
    topBars = Array.from(document.querySelectorAll('.topBar'));
    snapOverlay = document.getElementById('snap-suggestion');
}

function createDefaultSettings() {
    return {
        version: SETTINGS_VERSION,
        theme: 'dark',
        fontSize: 'large',
        openApps: appDefinitions.filter(app => app.defaultOpen).map(app => app.id),
        windows: Object.fromEntries(
            appDefinitions.map(app => [
                app.id,
                {
                    ...app.defaultWindow,
                    z: app.defaultOpen ? 1 : 0,
                    ...(app.id === 'snake' ? { highScore: 0 } : {}),
                },
            ]),
        ),
        highestZ: 1,
    };
}

function readStoredSettings() {
    const storedValue =
        localStorage.getItem(STORAGE_KEY) ??
        localStorage.getItem(LEGACY_STORAGE_KEY);

    if (!storedValue) {
        return null;
    }

    try {
        return JSON.parse(storedValue);
    } catch {
        return null;
    }
}

function migrateSettings(storedSettings) {
    if (!storedSettings) {
        return null;
    }

    let migrated = storedSettings.version
        ? { ...storedSettings }
        : { ...storedSettings, version: 1 };

    if (migrated.version > SETTINGS_VERSION) {
        return null;
    }

    while (migrated.version < SETTINGS_VERSION) {
        const migrate = settingsMigrations[migrated.version];
        if (!migrate) {
            return null;
        }
        migrated = migrate(migrated);
    }

    return migrated;
}

function mergeSettingsWithDefaults(storedSettings) {
    const defaults = createDefaultSettings();
    const validIds = new Set(appDefinitions.map(app => app.id));

    if (!storedSettings) {
        return defaults;
    }

    return {
        ...defaults,
        ...storedSettings,
        version: SETTINGS_VERSION,
        openApps: (storedSettings.openApps ?? defaults.openApps).filter(id =>
            validIds.has(id),
        ),
        windows: Object.fromEntries(
            appDefinitions.map(app => [
                app.id,
                {
                    ...defaults.windows[app.id],
                    ...(storedSettings.windows?.[app.id] ?? {}),
                },
            ]),
        ),
        highestZ: Number(storedSettings.highestZ) || defaults.highestZ,
    };
}

function loadSettings() {
    settings = mergeSettingsWithDefaults(migrateSettings(readStoredSettings()));
    saveSettings();

    for (const appId of settings.openApps) {
        openApp(appId, false, false);
    }

    fillSettingBlocks();
}

function resetSettings() {
    settings = createDefaultSettings();

    for (const app of appElements) {
        app.classList.remove('show');
        applyWindowSettings(app);
    }

    for (const appId of settings.openApps) {
        openApp(appId, false, false);
    }

    saveSettings();
}

function saveSettings() {
    settings.version = SETTINGS_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    fillSettingBlocks();
}

function bindDesktopEvents() {
    for (const app of appElements) {
        app.addEventListener('mousedown', () => setHighest(app));
    }

    for (const button of document.querySelectorAll('.resize-button')) {
        button.addEventListener('mousedown', event => {
            event.preventDefault();
            startResize(button.closest('.app-content'), event.clientX, event.clientY);
        });
        button.addEventListener('touchstart', event => {
            event.preventDefault();
            const touch = event.touches[0];
            startResize(button.closest('.app-content'), touch.clientX, touch.clientY);
        });
    }

    for (const button of document.querySelectorAll('.fullsize-button')) {
        button.addEventListener('click', () => {
            const app = button.closest('.app-content');
            snapWindowToZone(app, 'full');
            updateWindowSettings(app);
            saveSettings();
        });
    }

    for (const button of document.querySelectorAll('.close-button')) {
        button.addEventListener('click', event => {
            event.stopPropagation();
            closeApp(button.closest('.app-content').id);
        });
    }

    for (const item of navItems) {
        item.addEventListener('click', () => openApp(item.dataset.target, true));
    }

    for (const topBar of topBars) {
        topBar.addEventListener('mousedown', event => {
            if (!event.target.closest('.resize-button, .fullsize-button, .close-button')) {
                startDrag(topBar, event.clientX, event.clientY);
            }
        });
        topBar.addEventListener('touchstart', event => {
            if (!event.target.closest('.resize-button, .fullsize-button, .close-button')) {
                const touch = event.touches[0];
                startDrag(topBar, touch.clientX, touch.clientY);
            }
        });
    }

    document
        .querySelector('[data-action="reset-settings"]')
        ?.addEventListener('click', resetSettings);
}

function applyWindowSettings(app) {
    const appSettings = settings.windows[app.id];
    app.style.left = appSettings.x;
    app.style.top = appSettings.y;
    app.style.width = appSettings.width;
    app.style.height = appSettings.height;
    app.style.zIndex = appSettings.z ?? 0;
}

function updateWindowSettings(app) {
    settings.windows[app.id] = {
        ...settings.windows[app.id],
        x: app.style.left,
        y: app.style.top,
        width: app.style.width,
        height: app.style.height,
        z: Number(app.style.zIndex) || 0,
    };
}

function openApp(targetId, forceHighest = true, persist = true) {
    const app = document.getElementById(targetId);
    if (!app || !settings.windows[targetId]) {
        return;
    }

    currentlyClosing = false;
    if (!settings.openApps.includes(targetId)) {
        settings.openApps.push(targetId);
    }

    applyWindowSettings(app);
    app.classList.add('show');

    if (targetId === 'snake') {
        document.getElementById('snake-score').innerText =
            `Highscore: ${settings.windows.snake.highScore ?? 0}`;
    }

    if (forceHighest) {
        setHighest(app);
    } else if (persist) {
        saveSettings();
    }
}

function closeApp(targetId) {
    const app = document.getElementById(targetId);
    if (!app) {
        return;
    }

    app.classList.remove('show');
    app.style.zIndex = '0';
    settings.windows[targetId].z = 0;
    settings.openApps = settings.openApps.filter(id => id !== targetId);

    document
        .querySelector(`[data-target="${targetId}"]`)
        ?.classList.remove('active');

    currentlyClosing = true;
    saveSettings();
}

function setHighest(app) {
    if (String(settings.highestZ) === app.style.zIndex) {
        return;
    }

    settings.highestZ += 1;
    app.style.zIndex = settings.highestZ;

    if (!currentlyClosing) {
        for (const navItem of navItems) {
            navItem.classList.toggle('active', navItem.dataset.target === app.id);
        }
    } else {
        currentlyClosing = false;
    }

    updateWindowSettings(app);
    saveSettings();
}

function getAppSettings(targetId) {
    return settings?.windows[targetId];
}

function fillSettingBlocks() {
    const settingContent = document.querySelector('#appSettings');
    if (!settingContent || !settings) {
        return;
    }

    settingContent.innerHTML = '';
    for (const app of appDefinitions) {
        const windowSettings = settings.windows[app.id];
        const appInfoBlock = document.createElement('div');
        appInfoBlock.classList.add('settingsBlock');
        appInfoBlock.innerText = [
            app.title,
            `Width: ${windowSettings.width}`,
            `Height: ${windowSettings.height}`,
            `X: ${windowSettings.x}`,
            `Y: ${windowSettings.y}`,
            `Z: ${windowSettings.z}`,
        ].join('\n');
        settingContent.appendChild(appInfoBlock);
    }
}

function snapWindowToZone(app, zoneName) {
    const zone = snapZones.find(item => item.name === zoneName);
    const desktopRect = app.parentElement.getBoundingClientRect();
    const width = desktopRect.width;
    const height = desktopRect.height;

    app.style.position = 'absolute';
    app.style.left = `${Math.floor(zone.x * width) + navbarWidth}px`;
    app.style.top = `${Math.floor(zone.y * height)}px`;
    app.style.width = `${Math.floor(zone.width * width) - borderSize}px`;
    app.style.height = `${Math.floor(zone.height * height) - borderSize}px`;
}

function startResize(app, x, y) {
    currentlyResizing = app;
    startX = x;
    startY = y;
    const style = document.defaultView.getComputedStyle(app);
    startWidth = Number.parseInt(style.width, 10);
    startHeight = Number.parseInt(style.height, 10);
    startPosLeft = Number.parseInt(style.left, 10);
    startPosTop = Number.parseInt(style.top, 10);

    handleMouseMoveResize = event => onResize(event.clientX, event.clientY);
    handleTouchMoveResize = event => {
        const touch = event.touches[0];
        onResize(touch.clientX, touch.clientY);
    };

    document.addEventListener('mousemove', handleMouseMoveResize);
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('touchmove', handleTouchMoveResize, { passive: false });
    document.addEventListener('touchend', stopResize);
}

function onResize(x, y) {
    if (!currentlyResizing) {
        return;
    }

    offsetX = x - startX;
    offsetY = y - startY;
    currentlyResizing.style.left = `${startPosLeft + offsetX}px`;
    currentlyResizing.style.top = `${startPosTop + offsetY}px`;
    currentlyResizing.style.width = `${startWidth - offsetX}px`;
    currentlyResizing.style.height = `${startHeight - offsetY}px`;
}

function stopResize() {
    if (currentlyResizing) {
        updateWindowSettings(currentlyResizing);
        saveSettings();
    }

    document.removeEventListener('mousemove', handleMouseMoveResize);
    document.removeEventListener('mouseup', stopResize);
    document.removeEventListener('touchmove', handleTouchMoveResize);
    document.removeEventListener('touchend', stopResize);
    currentlyResizing = null;
}

function startDrag(topBar, x, y) {
    currentlyDragging = topBar.parentElement;
    isDragging = true;
    offsetX = x - currentlyDragging.offsetLeft;
    offsetY = y - currentlyDragging.offsetTop;
    topBar.style.cursor = 'grabbing';

    handleMouseMoveDrag = event => onDrag(event.clientX, event.clientY);
    handleTouchMoveDrag = event => {
        const touch = event.touches[0];
        onDrag(touch.clientX, touch.clientY);
    };
    handleMouseSnappingZone = event =>
        handleSnappingZone(event, event.clientX, event.clientY);
    handleTouchSnappingZone = event => {
        const touch = event.touches[0];
        handleSnappingZone(event, touch.clientX, touch.clientY);
    };

    document.addEventListener('mousemove', handleMouseMoveDrag);
    document.addEventListener('touchmove', handleTouchMoveDrag, { passive: false });
    document.addEventListener('mousemove', handleMouseSnappingZone);
    document.addEventListener('touchmove', handleTouchSnappingZone, { passive: false });
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);
}

function onDrag(x, y) {
    if (!isDragging) {
        return;
    }

    currentlyDragging.style.left = `${Math.max(navbarWidth, x - offsetX)}px`;
    currentlyDragging.style.top = `${Math.max(0, y - offsetY)}px`;
}

function stopDrag() {
    if (currentlyDragging) {
        if (isSuggesting && snapArea) {
            snapWindowToZone(currentlyDragging, snapArea);
        }
        updateWindowSettings(currentlyDragging);
        currentlyDragging.querySelector('.topBar').style.cursor = 'grab';
        saveSettings();
    }

    isDragging = false;
    isSuggesting = false;
    snapOverlay.style.display = 'none';
    document.removeEventListener('mousemove', handleMouseMoveDrag);
    document.removeEventListener('touchmove', handleTouchMoveDrag);
    document.removeEventListener('mousemove', handleMouseSnappingZone);
    document.removeEventListener('touchmove', handleTouchSnappingZone);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchend', stopDrag);
    currentlyDragging = null;
}

function handleSnappingZone(_event, x, y) {
    const desktopRect = document.getElementById('window').getBoundingClientRect();
    const width = desktopRect.width;
    const height = desktopRect.height;

    snapArea = '';
    if (x > width - windowMarginX) {
        snapArea =
            y > height - windowMarginY
                ? 'bottom-right'
                : y < windowMarginY
                  ? 'top-right'
                  : 'right-half';
    } else if (x < windowMarginX + navbarWidth) {
        snapArea =
            y > height - windowMarginY
                ? 'bottom-left'
                : y < windowMarginY
                  ? 'top-left'
                  : 'left-half';
    } else if (y < windowMarginY) {
        snapArea =
            x > width / 2 + navbarWidth - windowMarginX &&
            x < windowMarginX + width / 2 + navbarWidth
                ? 'full'
                : 'top-half';
    } else if (y > height - windowMarginY) {
        snapArea = 'bottom-half';
    }

    isSuggesting = Boolean(snapArea);
    if (!isSuggesting) {
        snapOverlay.style.display = 'none';
        return;
    }

    const zone = snapZones.find(item => item.name === snapArea);
    snapOverlay.style.display = 'block';
    snapOverlay.style.left = `${zone.x * width + navbarWidth}px`;
    snapOverlay.style.top = `${zone.y * height}px`;
    snapOverlay.style.width = `${zone.width * width}px`;
    snapOverlay.style.height = `${zone.height * height}px`;
    snapOverlay.style.zIndex = Math.max(0, settings.highestZ - 1);
}

function initialiseCarousel() {
    const carousel = document.querySelector('.carousel');
    const track = document.querySelector('.carousel-track');
    if (!carousel || !track) {
        return;
    }

    const slides = Array.from(track.children);
    const nextButton = carousel.querySelector('.next');
    const previousButton = carousel.querySelector('.prev');
    const pinButton = carousel.querySelector('.pin');
    let currentSlide = 0;
    let isAutoplay = true;
    let autoplayInterval;

    const updatePosition = () => {
        track.style.transform = `translateX(-${currentSlide * 100}%)`;
    };
    const next = () => {
        currentSlide = (currentSlide + 1) % slides.length;
        updatePosition();
    };
    const previous = () => {
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        updatePosition();
    };
    const startAutoplay = () => {
        clearInterval(autoplayInterval);
        autoplayInterval = setInterval(next, 3000);
    };
    const stopAutoplay = () => clearInterval(autoplayInterval);

    nextButton.addEventListener('click', next);
    previousButton.addEventListener('click', previous);
    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', () => {
        if (isAutoplay) {
            startAutoplay();
        }
    });
    pinButton.addEventListener('click', () => {
        isAutoplay = !isAutoplay;
        pinButton.innerHTML = isAutoplay
            ? '<i class="fa-solid fa-thumbtack-slash"></i>'
            : '<i class="fa-solid fa-thumbtack"></i>';
        isAutoplay ? startAutoplay() : stopAutoplay();
    });

    startAutoplay();
}

window.getAppSettings = getAppSettings;
window.saveSettings = saveSettings;
window.resetSettings = resetSettings;

initialiseDesktop();
