// Desktop shortcuts and the taskbar share the existing saved window settings.
function applyTaskbarPosition() {
    const position = ['left', 'bottom', 'right', 'top'].includes(settings.taskbarPosition)
        ? settings.taskbarPosition : 'left';
    settings.taskbarPosition = position;
    document.body.dataset.taskbarPosition = position;
    document.getElementById('taskbar-position').value = position;
}

function initializeTaskbarSettings() {
    applyTaskbarPosition();
    document.getElementById('taskbar-position').addEventListener('change', event => {
        cancelDrag();
        stopResize();
        settings.taskbarPosition = event.target.value;
        applyTaskbarPosition();
        layoutDesktopIcons();
        saveSettings();
    });
}

function syncTaskbar() {
    const openWindows = [...appElements].filter(app => app.classList.contains('show'));
    const front = openWindows.reduce((highest, app) =>
        !highest || Number(app.style.zIndex) > Number(highest.style.zIndex) ? app : highest, null);
    navItems.forEach(item => {
        item.hidden = !settings.openApps?.includes(item.dataset.target);
        const minimized = !!getAppSettings(item.dataset.target)?.minimized;
        item.classList.toggle('minimized', minimized);
        item.classList.toggle('active', item.dataset.target === front?.id);
        item.setAttribute('aria-pressed', String(item.dataset.target === front?.id));
        item.title = item.querySelector('.label').textContent + (minimized ? ' — restore' : '');
    });
}

function pauseHiddenApp(targetId) {
    if (targetId === 'snake' && gameState === 'playing') pauseSnake();
}

function minimizeApp(targetId) {
    const app = document.getElementById(targetId);
    const saved = getAppSettings(targetId);
    if (!app || !saved || !settings.openApps.includes(targetId)) return;
    cancelDrag();
    stopResize();
    getAppSettings(targetId).minimized = true;
    app.classList.remove('show');
    pauseHiddenApp(targetId);
    saveSettings();
    document.querySelector(`.nav-item[data-target="${targetId}"]`)?.focus();
}

function toggleTaskbarApp(targetId) {
    const app = document.getElementById(targetId);
    const item = document.querySelector(`.nav-item[data-target="${targetId}"]`);
    if (app?.classList.contains('show') && item?.classList.contains('active')) {
        minimizeApp(targetId);
    } else {
        openApp(targetId, true);
        if (app) {
            app.tabIndex = -1;
            app.focus();
        }
    }
}

function positionDesktopIcon(icon, x, y) {
    const desktop = icon.parentElement;
    const left = Math.max(0, Math.min(x, desktop.clientWidth - icon.offsetWidth));
    const top = Math.max(0, Math.min(y, desktop.clientHeight - icon.offsetHeight));
    icon.style.left = `${left}px`;
    icon.style.top = `${top}px`;
    return { x: left, y: top };
}

function layoutDesktopIcons() {
    desktopIcons.forEach((icon, index) => {
        const rows = Math.max(1, Math.floor((icon.parentElement.clientHeight - 20) / 112));
        const saved = settings.desktopPositions?.[icon.dataset.target];
        positionDesktopIcon(icon,
            Number.isFinite(saved?.x) ? saved.x : 20 + Math.floor(index / rows) * 112,
            Number.isFinite(saved?.y) ? saved.y : 20 + (index % rows) * 112);
    });
}

function initializeDesktopIcons() {
    layoutDesktopIcons();
    window.addEventListener('resize', layoutDesktopIcons);
    desktopIcons.forEach(icon => {
        let drag = null;
        let suppressOpenUntil = 0;
        icon.title = 'Double-click to open; drag to move';
        icon.addEventListener('dragstart', event => event.preventDefault());
        icon.addEventListener('pointerdown', event => {
            if (event.button !== 0 || !event.isPrimary) return;
            drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
                left: icon.offsetLeft, top: icon.offsetTop, moved: false };
            icon.setPointerCapture(event.pointerId);
        });
        icon.addEventListener('pointermove', event => {
            if (!drag || event.pointerId !== drag.id) return;
            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            if (!drag.moved && Math.hypot(dx, dy) < 6) return;
            drag.moved = true;
            icon.classList.add('is-dragging');
            positionDesktopIcon(icon, drag.left + dx, drag.top + dy);
        });
        const finish = event => {
            if (!drag || event.pointerId !== drag.id) return;
            if (drag.moved) {
                suppressOpenUntil = Date.now() + 500;
                settings.desktopPositions ??= {};
                settings.desktopPositions[icon.dataset.target] = { x: icon.offsetLeft, y: icon.offsetTop };
                saveSettings();
            }
            drag = null;
            icon.classList.remove('is-dragging');
            if (icon.hasPointerCapture(event.pointerId)) icon.releasePointerCapture(event.pointerId);
        };
        icon.addEventListener('pointerup', finish);
        icon.addEventListener('pointercancel', finish);
        icon.addEventListener('lostpointercapture', finish);
        icon.addEventListener('dblclick', () => {
            if (Date.now() >= suppressOpenUntil) openApp(icon.dataset.target, true);
        });
        // Preserve standard keyboard activation for these native buttons.
        icon.addEventListener('click', event => {
            if (event.detail === 0 && Date.now() >= suppressOpenUntil) openApp(icon.dataset.target, true);
        });
    });
}
