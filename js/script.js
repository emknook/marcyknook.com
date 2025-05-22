let settings = {};
let highestZ = 0;
const navItems = document.querySelectorAll(".nav-item");
const appElements = document.querySelectorAll(".app-content");
const topBars = document.querySelectorAll(".topBar");
let isDragging = false;
let currentlyResizing;
let startX, startY, startWidth, startHeight, startPosLeft;
let handleMouseMoveDrag, handleTouchMoveDrag, handleMouseMoveResize, handleTouchMoveResize;
let offsetX, offsetY;
let currentlyDragging;
let currentlyClosing = false;

let isSuggesting = false;
const snapOverlay = document.getElementById('snap-suggestion');
const windowMarginY = 10;
const windowMarginX = 50;
const navbarWidth = 60; // if applicable

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
    openApp('app0', false);
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
    handleMouseMoveResize = (e) => onResize(e.clientX, e.clientY);
    handleTouchMoveResize = (e) => {
        const touch = e.touches[0];
        onResize(touch.clientX, touch.clientY);
    };

    document.addEventListener('mousemove', handleMouseMoveResize);
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('touchmove', handleTouchMoveResize, { passive: false });
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
        document.removeEventListener('mousemove', handleMouseMoveResize);
        document.removeEventListener('mouseup', stopResize);
        document.removeEventListener('touchmove', handleTouchMoveResize);
        document.removeEventListener('touchend', stopResize);
        updateApp(app.id, app.style.left, app.style.top, app.style.height, app.style.width, app.style.zIndex);
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

    handleMouseMoveDrag = (e) => onDrag(e.clientX, e.clientY);
    handleTouchMoveDrag = (e) => {
        const touch = e.touches[0];
        onDrag(touch.clientX, touch.clientY);
    };

    document.addEventListener("mousemove", handleMouseMoveDrag);
    document.addEventListener("touchmove", handleTouchMoveDrag, { passive: false });
    document.addEventListener("mousemove", handleSnappingZone);
    document.addEventListener("mouseup", stopDrag);
    document.addEventListener("touchend", stopDrag);
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

function stopDrag(e) {
    let app = currentlyDragging;
    if (app) {
        document.removeEventListener("mousemove", handleMouseMoveDrag);
        document.removeEventListener("touchmove", handleTouchMoveDrag);
        document.removeEventListener("mousemove", handleSnappingZone);
        document.removeEventListener("mouseup", stopDrag);
        document.removeEventListener("touchend", stopDrag);
        updateApp(app.id, app.style.left, app.style.top, app.style.height, app.style.width, app.style.zIndex);
        isDragging = false;
        e.target.style.cursor = "grab";
    }
    currentlyDragging = null;
}

function loadSettings() {
    const loadedSettings = localStorage.getItem('userSettings');
    if (loadedSettings) {
        settings = JSON.parse(loadedSettings);
        if (!settings.openApps) {
            resetSettings();
        }
        settings.openApps.forEach(e => {
            openApp(e, false);
        });
    } else {
        resetSettings();
    }

    appElements.forEach(app => {
        highestZ = app.style.zIndex > highestZ ? app.style.zIndex : highestZ;

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
            openApp(targetId, true);
        });
    });

    topBars.forEach(topBar => {
        topBar.addEventListener("mousedown", (e) => {
            if (!currentlyResizing) {
                startDrag(topBar, e.clientX, e.clientY);
            }
        });

        topBar.addEventListener("touchstart", (e) => {
            if (!currentlyResizing) {
                const touch = e.touches[0];
                startDrag(topBar, touch.clientX, touch.clientY);
            }
        });
    });

    fillSettingBlocks();
}

function fillSettingBlocks() {
    const settingContent = document.querySelectorAll("#settings #content")[0];
    for (const app in settings.appSettings) {
        //create div
        const appInfoBlock = document.createElement('div');

        //name
        //width
        //height
        //x, y, z
        //extra settings?
        //open / close can be saved here?
    }

}

function saveSettings() {
    localStorage.setItem('userSettings', JSON.stringify(settings));


}

function updateApp(name, x, y, height, width, z) {
    const index = settings.appSettings.findIndex(app => app.name === name);
    let newApp = { name, x, y, height, width, z };
    if (index !== -1) {
        // App exists, update it
        settings.appSettings[index] = { ...settings.appSettings[index], ...newApp };
    } else {
        // App doesn't exist, add it
        settings.appSettings.push(newApp);
    }
    saveSettings()
}

function openApp(targetId, forceHighest) {
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
            app.style.zIndex = settings.appSettings[index].z;
            if (forceHighest) {
                setHighest(app);
            }
            app.classList.add("show");
            updateApp(app.id, app.style.left, app.style.top, app.style.height, app.style.width, app.style.zIndex);
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
    saveSettings();
}

function handleSnappingZone(e) {
    if (!isDragging) return; // your own drag tracking boolean

    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const winWidth = window.innerWidth;
    const halfWidth = winWidth / 2 - 20;
    const halfX = winWidth / 2 + 10;
    const itemWidth = winWidth - 20;

    const winHeight = window.innerHeight;
    const halfHeight = winHeight / 2 - 20;
    const halfY = winHeight / 2 + 10;
    const itemHeight = winHeight - 20;

    let snapArea = null;

    if (mouseX > winWidth - windowMarginX) {
        if (mouseY > winHeight - windowMarginY) {
            // right lower corner
            snapArea = { left: halfX, top: halfY, width: halfWidth, height: halfHeight };
        } else if (mouseY < windowMarginY) {
            // right upper corner
            snapArea = { left: halfX, top: 10, width: halfWidth, height: halfHeight };
        } else {
            // right side
            snapArea = { left: halfX, top: 10, width: halfWidth, height: itemHeight };
        }
    } else if (mouseX < windowMarginX + navbarWidth) {
        if (mouseY > winHeight - windowMarginY) {
            // left lower corner
            snapArea = { left: 10, top: halfY, width: halfWidth, height: halfHeight };
        } else if (mouseY < windowMarginY) {
            // left upper corner
            snapArea = { left: 10, top: 10, width: halfWidth, height: halfHeight };
        } else {
            // left side
            snapArea = { left: 10, top: 10, width: halfWidth, height: itemHeight };
        }
    } else if (mouseY < windowMarginY) {
        // fill upper half
        snapArea = { left: 10, top: 10, width: itemWidth, height: halfHeight };
    } else if (mouseY > winHeight - windowMarginY) {
        // fill lower half
        snapArea = { left: 10, top: halfY, width: itemWidth, height: halfHeight };
    } else {
        isSuggesting = false;
    }
    if (snapArea) {
        isSuggesting = true;
        snapOverlay.style.display = 'block';
        snapOverlay.style.left = `${snapArea.left}px`;
        snapOverlay.style.top = `${snapArea.top}px`;
        snapOverlay.style.width = `${snapArea.width}px`;
        snapOverlay.style.height = `${snapArea.height}px`;
    } else {
        snapOverlay.style.display = 'none';
    }
}
