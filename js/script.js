
let settings = {};
let highestZ = 0;
const navItems = document.querySelectorAll(".nav-item");
const appElements = document.querySelectorAll(".app-content");
const topBar = document.querySelectorAll(".topBar");
let isDragging = false;
let currentlyResizing;
let startX, startY, startWidth, startHeight, startPosLeft;
let offsetX, offsetY;
let currentlyDragging;
let currentlyClosing = false;

function resetSettings() {
    appElements.forEach(app => {
        closeApp(app.id)
    });
    settings = {
        theme: 'dark',
        fontSize: 'large',
        openApps: ['app0'],
        appSettings: []
    };
    saveSettings()
    openApp('app0');
}

function setHighest(targetApp) {
    highestZ++;
    targetApp.style.zIndex = highestZ;
    if (!currentlyClosing) {
        navItems.forEach(navItem => {
            navItem.dataset.target === targetApp.id ? navItem.classList.add("active") : navItem.classList.remove("active");
        });
    } else {
        currentlyClosing = false;
    }
}

//startResize => mousedown / touchstart
function startResize(app, x, y) {
    currentlyResizing = app;
    startX = x;
    startY = y;
    startWidth = parseInt(document.defaultView.getComputedStyle(currentlyResizing).width, 10);
    startHeight = parseInt(document.defaultView.getComputedStyle(currentlyResizing).height, 10);
    startPosLeft = parseInt(document.defaultView.getComputedStyle(currentlyResizing).left, 10);
    startPosTop = parseInt(document.defaultView.getComputedStyle(currentlyResizing).top, 10);
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
        let newHeight = startHeight - offsetY;
        let newTop = startPosTop + offsetY;
        let newLeft = startPosLeft + offsetX;
        currentlyResizing.style.left = newLeft + 'px';
        currentlyResizing.style.width = newWidth + 'px';
        currentlyResizing.style.height = newHeight + 'px';
        currentlyResizing.style.top = newTop + 'px';
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

function startDrag(topBar, x, y) {
    // save startLocation for dragging
    let windowEl = topBar.parentElement;
    isDragging = true; //boolean (can also be currentlyDragging != null?)
    currentlyDragging = topBar.parentElement;
    offsetX = x - windowEl.offsetLeft;
    offsetY = y - windowEl.offsetTop;
    topBar.style.cursor = "grabbing";
}

function onDrag(x, y) {
    if (isDragging) {
        let newLeft = (x - offsetX) + "px";
        let newTop = (y - offsetY) + "px";
        newLeft = newLeft < 50 ? 50 : newLeft;
        newTop = newTop < 50 ? 50 : newTop;
        currentlyDragging.style.left = newLeft;
        currentlyDragging.style.top = newTop;
    }
}

function stopDrag(topBar) {
    let app = currentlyDragging;
    if (app) {
        updateApp(app.id, app.style.left, app.style.top, app.style.height, app.style.width);
        currentlyDragging = null;
        isDragging = false;
        topBar.style.cursor = "grab";
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
    const resizeButtons = document.querySelectorAll('.resize-button');
    resizeButtons.forEach(button => {
        button.addEventListener('mousedown', function (e) {
            e.preventDefault();
            startResize(e.currentTarget.parentElement.parentElement, e.clientX, e.clientY);
        });
        button.addEventListener('touchstart', function (e) {
            e.preventDefault();
            const touch = e.touches[0];
            startResize(e.currentTarget.parentElement.parentElement, touch.clientX, touch.clientY);
        });
    });

    const closeButtons = document.querySelectorAll('.close-button');
    closeButtons.forEach(button => {
        button.addEventListener('mousedown', function (e) {
            e.preventDefault();
            closeApp(e.currentTarget.parentElement.parentElement.id);
        })
    });

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetId = item.getAttribute("data-target");
            openApp(targetId);
        });
    });

    topBar.forEach(topBar => {
        topBar.addEventListener("mousedown", (e) => {
            startDrag(topBar, e.clientX, e.clientY);
        });

        topBar.addEventListener("touchstart", (e) => {
            const touch = e.touches[0];
            startDrag(topBar, touch.clientX, touch.clientY);
        });

        document.addEventListener("mousemove", (e) => {
            onDrag(e.clientX, e.clientY);
        });

        document.addEventListener("touchmove", (e) => {
            const touch = e.touches[0];
            onDrag(touch.clientX, touch.clientY);
        }, { passive: false });

        document.addEventListener("mouseup", () => {
            stopDrag(topBar);
        });

        document.addEventListener("touchend", stopDrag);
    });
}

function saveSettings() {
    localStorage.setItem('userSettings', JSON.stringify(settings));


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
    saveSettings()
}

function openApp(targetId) {
    currentlyClosing = false;
    let index = settings.appSettings.findIndex(app => app.name === targetId);
    let w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    let h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    if (index === -1) { //no settings saved for app
        appElements.forEach(app => {
            if (app.id === targetId) {
                settings.appSettings.push({ name: targetId, x: w * 0.2 + 'px', y: h * 0.15 + 'px', height: h * 0.7 + 'px', width: w * 0.7 + 'px' });
            }
        });
    }
    //if in settings.openApps, don't do anything, else, add
    if (!settings.openApps.includes(targetId)) {
        settings.openApps.push(targetId);
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
            updateApp(app.id, app.style.left, app.style.top, app.style.height, app.style.width);
        }
    });
}

function closeApp(targetId) {
    appElements.forEach(app => {
        if (app.id === targetId) {
            app.classList.remove('show');
        }
    });
    navItems.forEach(item => {
        if (item.dataset.target === targetId) {
            item.classList.remove('active');
        }
    });
    if (settings.openApps) {
        let index = settings.openApps.findIndex(e => e.name === targetId);
        settings.openApps.splice(index, 1);
    }
    currentlyClosing = true;
}