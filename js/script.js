
let settings = {};
let highestZ = 0;
const navItems = document.querySelectorAll(".nav-item");
const appElements = document.querySelectorAll(".app-content");
const handleEls = document.getElementsByClassName("draggable");
let isDragging = false; let currentlyResizing;
let startX, startY, startWidth, startHeight, startPosLeft;
let offsetX, offsetY;
let currentlyDragging;

function resetSettings() {
    settings = {
        theme: 'dark',
        fontSize: 'large',
        openApps: ['app0'],
        appSettings: []
    };
    localStorage.setItem('userSettings', JSON.stringify(settings));
}

function setHighest(targetApp) {
    highestZ++;
    targetApp.style.zIndex = highestZ;
    navItems.forEach(navItem => {
        navItem.dataset.target === targetApp.id ? navItem.classList.add("active") : navItem.classList.remove("active");
    });
}

//startResize => mousedown / touchstart
function startResize(app, x, y) {
    currentlyResizing = app;
    startX = x;
    startY = y;
    startWidth = parseInt(document.defaultView.getComputedStyle(currentlyResizing).width, 10);
    startHeight = parseInt(document.defaultView.getComputedStyle(currentlyResizing).height, 10);
    startPosLeft = parseInt(document.defaultView.getComputedStyle(currentlyResizing).left, 10);
    document.addEventListener('mousemove', (e) => {
        onResize(e.clientX, e.clientY);
    });
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        onResize(touch.clientX, touch.clientY);
    }, { passive: false });
    document.addEventListener('touchend', stopResize);
}

//onResize => mousemove / touchmove
function onResize(x, y) {
    if (currentlyResizing) {
        offsetX = x - startX;
        offsetY = y - startY;
        let newWidth = startWidth - offsetX;
        let newHeight = startHeight + offsetY;
        let newLeft = startPosLeft + offsetX;
        currentlyResizing.style.left = newLeft + 'px';
        currentlyResizing.style.width = newWidth + 'px';
        currentlyResizing.style.height = newHeight + 'px';
    }
}

//stopResize => mouseup / touchend
function stopResize() {
    let app = currentlyResizing;
    if (app) {
        document.removeEventListener('mousemove', onResize);
        document.removeEventListener('mouseup', stopResize);
        document.removeEventListener('touchmove', onResize);
        document.removeEventListener('touchend', stopResize);
        updateApp(app.id, app.style.left, app.style.top, app.style.height, app.style.width);
    }
    currentlyResizing = null;
}

function startDrag(handleBar, x, y) {
    let windowEl = handleBar.parentElement;
    isDragging = true;
    currentlyDragging = handleBar.parentElement;
    offsetX = x - windowEl.offsetLeft;
    offsetY = y - windowEl.offsetTop;
    handleBar.style.cursor = "grabbing";
}

function onMove(x, y) {
    if (isDragging) {
        let newLeft = (x - offsetX) + "px";
        let newTop = (y - offsetY) + "px";
        newLeft = newLeft < 50 ? 50 : newLeft;
        newTop = newTop < 50 ? 50 : newTop;
        currentlyDragging.style.left = newLeft;
        currentlyDragging.style.top = newTop;
    }
}

function stopDrag(handleBar) {
    let app = currentlyDragging;
    if (app) {
        updateApp(app.id, app.style.left, app.style.top, app.style.height, app.style.width);
        currentlyDragging = null;
        isDragging = false;
        handleBar.style.cursor = "grab";
    }
}

function loadSettings() {
    const loadedSettings = localStorage.getItem('userSettings');
    if (loadedSettings) {
        settings = JSON.parse(loadedSettings);
        if (!settings.openApps) {
            resetSettings();
        }
        settings.openApps.forEach(e => {
            openApp(e);
        });
    } else {
        resetSettings();
    }

    appElements.forEach(app => {
        app.style.zIndex = highestZ;

        app.addEventListener('mousedown', () => {
            setHighest(app);
        });
    });

    const resizeButtons = document.getElementsByClassName('resize-button');
    for (let i = 0; i < resizeButtons.length; i++) {
        let button = resizeButtons.item(i);
        button.addEventListener('mousedown', function (e) {
            e.preventDefault();
            startResize(e.currentTarget.parentElement, e.clientX, e.clientY);
        });
        button.addEventListener('touchstart', function (e) {
            e.preventDefault();
            const touch = e.touches[0];
            startResize(e.currentTarget.parentElement, touch.clientX, touch.clientY);
        });
    }

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetId = item.getAttribute("data-target");
            openApp(targetId);
        });
    });

    Array.from(handleEls).forEach(handleBar => {
        handleBar.addEventListener("mousedown", (e) => {
            startDrag(handleBar, e.clientX, e.clientY);
        });

        handleBar.addEventListener("touchstart", (e) => {
            const touch = e.touches[0];
            startDrag(handleBar, touch.clientX, touch.clientY);
        });

        document.addEventListener("mousemove", (e) => {
            onMove(e.clientX, e.clientY);
        });

        document.addEventListener("touchmove", (e) => {
            const touch = e.touches[0];
            onMove(touch.clientX, touch.clientY);
        }, { passive: false });

        document.addEventListener("mouseup", () => {
            stopDrag(handleBar);
        });

        document.addEventListener("touchend", stopDrag);
    });
}

function updateApp(name, x, y, height, width) {
    const index = settings.appSettings.findIndex(app => app.name === name);
    let newApp = { name, x, y, height, width };
    if (index !== -1) {
        // App exists, update it
        settings.appSettings[index] = { ...settings.appSettings[index], ...newApp };
    } else {
        // App doesn't exist, add it
        settings.appSettings.push(newApp);
    }
    localStorage.setItem('userSettings', JSON.stringify(settings));
}

function openApp(targetId) {
    //TODO: rewrite to a toggle for close
    let index = settings.appSettings.findIndex(app => app.name === targetId);
    let targetApp;
    let w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    let h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    if (index === -1) { //no settings saved for app
        appElements.forEach(app => {
            if (app.id === targetId) {
                targetApp = app;
                settings.appSettings.push({ name: targetId, x: w * 0.25 + 'px', y: h * 0.25 + 'px', height: h * 0.5 + 'px', width: w * 0.5 + 'px' });
            }
        });
    }
    index = settings.appSettings.findIndex(app => app.name === targetId);
    appElements.forEach(app => {
        if (app.id === targetId) {
            app.style.height = settings.appSettings[index].height;
            app.style.width = settings.appSettings[index].width;
            app.style.top = settings.appSettings[index].y;
            app.style.left = settings.appSettings[index].x;
            setHighest(app);
            app.classList.add("show");
        }
    });
    //if in settings.openApps, don't do anything, else, add
    if (!settings.openApps.includes(targetId)) {
        settings.openApps.push(targetId);
    }
}