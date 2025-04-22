var settings = {};

const navItems = document.querySelectorAll(".nav-item");
const appContents = document.querySelectorAll(".app-content");
function resetSettings() {
    settings = {
        theme: 'dark',
        fontSize: 'large',
        openApp: 'app0',
        apps: []
    };
    localStorage.setItem('userSettings', JSON.stringify(settings));
}

function loadSettings() {
    const loadedSettings = localStorage.getItem('userSettings');
    if (loadedSettings) {
        settings = JSON.parse(loadedSettings);
        openApp(settings.openApp);
    } else {
        resetSettings();
    }

    const resizeButtons = document.getElementsByClassName('resize-button');
    for (var i = 0; i < resizeButtons.length; i++) {
        var button = resizeButtons.item(i);
        button.addEventListener('mousedown', function (e) {
            e.preventDefault();
            var resizable = e.currentTarget.parentElement;
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = parseInt(document.defaultView.getComputedStyle(resizable).width, 10);
            const startHeight = parseInt(document.defaultView.getComputedStyle(resizable).height, 10);

            function doDrag(e) {
                const newWidth = startWidth - ((e.clientX - startX) * 2);
                const newHeight = startHeight + ((e.clientY - startY) * 2);

                resizable.style.width = newWidth + 'px';
                resizable.style.height = newHeight + 'px';
            }

            function stopDrag() {
                document.documentElement.removeEventListener('mousemove', doDrag);
                document.documentElement.removeEventListener('mouseup', stopDrag);
                updateApp(resizable.id, null, null, resizable.style.height, resizable.style.width);
            }
            document.documentElement.addEventListener('mousemove', doDrag);
            document.documentElement.addEventListener('mouseup', stopDrag);
        });
    }
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetId = item.getAttribute("data-target");
            openApp(targetId);
        });
    });
}

function updateApp(name, x, y, height, width) {
    const index = settings.apps.findIndex(app => app.name === name);
    var newApp = { name, x, y, height, width };
    if (index !== -1) {
        // Page exists, update it
        settings.apps[index] = { ...settings.apps[index], ...newApp };
    } else {
        // Page doesn't exist, add it
        settings.apps.push(newApp);
    }
    localStorage.setItem('userSettings', JSON.stringify(settings));
}

function openApp(targetId) {
    //TODO: rewrite to a toggle for close
    const index = settings.apps.findIndex(app => app.name === targetId);
    appContents.forEach(app => {
        app.id === targetId ? app.classList.add("show") : app.classList.remove("show");
        if (app.id === targetId && index !== -1) {
            app.style.height = settings.apps[index].height;
            app.style.width = settings.apps[index].width;
        }
    });
    navItems.forEach(navItem => {
        navItem.dataset.target === targetId ? navItem.classList.add("active") : navItem.classList.remove("active");
    });
    applySetting('openApp', targetId)
}

function applySetting(name, variable) {
    settings[name] = variable;
    localStorage.setItem('userSettings', JSON.stringify(settings));
}