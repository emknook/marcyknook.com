let settings = {};
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
let suggestion = '';
let isSuggesting = false;
const snapOverlay = document.getElementById('snap-suggestion');
const windowMarginY = 30;
const windowMarginX = 50;
const navbarWidth = 52;
let snapArea = '';
const snapZones = [
    { name: 'top-left', x: 0, y: 0, width: 0.5, height: 0.5 },
    { name: 'top-right', x: 0.5, y: 0, width: 0.5, height: 0.5 },
    { name: 'bottom-left', x: 0, y: 0.5, width: 0.5, height: 0.5 },
    { name: 'bottom-right', x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
    { name: 'left-half', x: 0, y: 0, width: 0.5, height: 1 },
    { name: 'right-half', x: 0.5, y: 0, width: 0.5, height: 1 },
    { name: 'top-half', x: 0, y: 0, width: 1, height: 0.5 },
    { name: 'bottom-half', x: 0, y: 0.5, width: 1, height: 0.5 },
    { name: 'full', x: 0, y: 0, width: 1, height: 1 }
];

function snapWindowToZone(el, zone) {
    const windowElRect = el.parentElement.getBoundingClientRect();
    const w = windowElRect.width;
    const h = windowElRect.height;

    el.style.position = 'absolute';
    el.style.left = `${(zone.x * w) + navbarWidth}px`;
    el.style.top = `${zone.y * h}px`;
    el.style.width = `${zone.width * w}px`;
    el.style.height = `${zone.height * h}px`;
}

resetSettings();
function resetSettings() {
    settings = {
        theme: 'dark',
        fontSize: 'large',
        openApps: ['app0'],
        appSettings: [],
        highestZ: "1"
    };
    appElements.forEach(app => {
        closeApp(app.id)
    });
    saveSettings();
    openApp('app0', false);
}

function setHighest(app) {
    if (settings.highestZ + "" === app.style.zIndex) return;
    settings.highestZ++;
    app.style.zIndex = settings.highestZ;
    if (!currentlyClosing) {
        navItems.forEach(navItem => {
            navItem.dataset.target === app.id ? navItem.classList.add("active") : navItem.classList.remove("active");
        });
    } else {
        currentlyClosing = false;
    }
    updateApp(app.id, app.style.left, app.style.top, app.style.height, app.style.width, app.style.zIndex);
    saveSettings();
}

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

function stopResize() {
    let app = currentlyResizing;
    if (app) {
        document.removeEventListener('mousemove', handleMouseMoveResize);
        document.removeEventListener('mouseup', stopResize);
        document.removeEventListener('touchmove', handleTouchMoveResize);
        document.removeEventListener('touchend', stopResize);
        updateApp(app.id, app.style.left, app.style.top, app.style.height, app.style.width, app.style.zIndex);
        saveSettings();
    }
    currentlyResizing = null;
}

function startDrag(topBar, x, y) {
    // save startLocation for dragging
    let draggingEl = topBar.parentElement;
    isDragging = true; //boolean (can also be currentlyDragging != null?)
    currentlyDragging = topBar.parentElement;
    offsetX = x - draggingEl.offsetLeft;
    offsetY = y - draggingEl.offsetTop;
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

function stopDrag() {
    let app = currentlyDragging;
    if (app) {
        document.removeEventListener("mousemove", handleMouseMoveDrag);
        document.removeEventListener("touchmove", handleTouchMoveDrag);
        document.removeEventListener("mousemove", handleSnappingZone);
        document.removeEventListener("mouseup", stopDrag);
        document.removeEventListener("touchend", stopDrag);

        if (isSuggesting) {
            const zone = snapZones.find(z => z.name === snapArea);
            snapWindowToZone(app, zone);
            isSuggesting = false;
            snapOverlay.style.display = 'none';
        }

        updateApp(app.id, app.style.left, app.style.top, app.style.height, app.style.width, app.style.zIndex);
        isDragging = false;
        currentlyDragging.querySelectorAll('.topBar')[0].style.cursor = "grab";
        saveSettings();
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
    const settingContent = document.querySelector("#appSettings");
    settingContent.innerHTML = "";
    for (const app of settings.appSettings) {
        //create div
        const appInfoBlock = document.createElement('div');
        appInfoBlock.classList.add('settingsBlock');
        const appInfoRow = "Name: " + app.name +
            "\nWidth:" + app.width +
            "\nHeight:" + app.height +
            "\nX:" + app.x +
            "\nY:" + app.y +
            "\nZ:" + app.z;
        appInfoBlock.innerText = appInfoRow;
        settingContent.appendChild(appInfoBlock);
    }
}

function saveSettings() {
    localStorage.setItem('userSettings', JSON.stringify(settings));
    fillSettingBlocks();
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
    saveSettings();
}

function closeApp(targetId) {
    appElements.forEach(app => {
        if (app.id === targetId) {
            app.classList.remove('show');
            app.style.zIndex = '0';
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
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const windowElRect = document.querySelector('.window').getBoundingClientRect();
    const winWidth = windowElRect.width;

    const winHeight = windowElRect.height;

    snapArea = null;
    if (mouseX > winWidth - windowMarginX) {
        if (mouseY > winHeight - windowMarginY) {
            snapArea = 'bottom-right';
        } else if (mouseY < windowMarginY) {
            snapArea = 'top-right';
        } else {
            snapArea = 'right-half';
        }
    } else if (mouseX < windowMarginX + navbarWidth) {
        if (mouseY > winHeight - windowMarginY) {
            snapArea = 'bottom-left';
        } else if (mouseY < windowMarginY) {
            snapArea = 'top-left';
        } else {
            snapArea = 'left-half';
        }
    } else if (mouseY < windowMarginY) {
        if (mouseX > winWidth / 2 + navbarWidth - windowMarginX && mouseX < windowMarginX + winWidth / 2 + navbarWidth) {
            snapArea = 'full';
        } else {
            snapArea = 'top-half';
        }
    } else if (mouseY > winHeight - windowMarginY) {
        snapArea = 'bottom-half';
    } else {
        isSuggesting = false;
    }
    if (snapArea) {
        isSuggesting = true;
        const zone = snapZones.find(z => z.name === snapArea);
        snapOverlay.style.display = 'block';
        snapOverlay.style.left = `${(zone.x * winWidth) + navbarWidth}px`;
        snapOverlay.style.top = `${zone.y * winHeight}px`;
        snapOverlay.style.width = `${zone.width * winWidth}px`;
        snapOverlay.style.height = `${zone.height * winHeight}px`;
        snapOverlay.style.zIndex = settings.highestZ - 1;
    } else {
        snapOverlay.style.display = 'none';
    }
}
