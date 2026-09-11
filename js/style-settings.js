let backgroundUrl = null;
let backgroundRevision = 0;
let backgroundStorageQueue = Promise.resolve();

function openResetConfirmation() {
    document.getElementById('reset-confirmation').showModal();
}

function confirmDesktopReset() {
    const dialog = document.getElementById('reset-confirmation');
    if (!dialog.open) return;
    dialog.close();
    resetSettings();
}

// Keep image blobs out of the small localStorage area used by window settings.
function backgroundStore(action, value) {
    const operation = backgroundStorageQueue.then(() => backgroundTransaction(action, value));
    backgroundStorageQueue = operation.catch(() => {});
    return operation;
}

function backgroundTransaction(action, value) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('portfolio-style', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('images');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction('images', action === 'get' ? 'readonly' : 'readwrite');
            const store = transaction.objectStore('images');
            const operation = action === 'put' ? store.put(value, 'background')
                : action === 'delete' ? store.delete('background') : store.get('background');
            transaction.oncomplete = () => { db.close(); resolve(operation.result); };
            transaction.onabort = () => { db.close(); reject(transaction.error); };
            transaction.onerror = () => { db.close(); reject(transaction.error); };
        };
    });
}

function showBackground(blob) {
    if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
    backgroundUrl = blob ? URL.createObjectURL(blob) : null;
    document.querySelector('.window').style.backgroundImage = backgroundUrl ? `url("${backgroundUrl}")` : 'none';
    document.getElementById('background-remove').disabled = !blob;
}

function applyBackgroundFit() {
    const fit = ['cover', 'contain', 'repeat'].includes(settings.backgroundFit) ? settings.backgroundFit : 'cover';
    const desktop = document.querySelector('.window');
    desktop.style.backgroundSize = fit === 'repeat' ? 'auto' : fit;
    desktop.style.backgroundRepeat = fit === 'repeat' ? 'repeat' : 'no-repeat';
    desktop.style.backgroundPosition = 'center';
    document.getElementById('background-fit').value = fit;
}

async function resetBackground() {
    const revision = ++backgroundRevision;
    showBackground(null);
    document.getElementById('background-image').value = '';
    document.getElementById('background-fit').value = 'cover';
    document.querySelector('.window').style.backgroundSize = 'cover';
    try {
        await backgroundStore('delete');
        if (revision === backgroundRevision) document.getElementById('background-status').textContent = '';
    } catch {
        if (revision === backgroundRevision) document.getElementById('background-status').textContent = 'Could not clear the saved background. Browser storage may be unavailable.';
    }
}

async function initializeStyleSettings() {
    const picker = document.getElementById('background-image');
    const status = document.getElementById('background-status');
    applyBackgroundFit();
    picker.addEventListener('change', async () => {
        const file = picker.files[0];
        if (!file) return;
        const revision = ++backgroundRevision;
        if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'].includes(file.type) || file.size > 20 * 1024 * 1024) {
            status.textContent = 'Choose a PNG, JPEG, WebP, GIF or AVIF image no larger than 20 MB.';
            picker.value = '';
            return;
        }
        picker.disabled = true;
        status.textContent = 'Saving background…';
        const previewUrl = URL.createObjectURL(file);
        try {
            const preview = new Image();
            preview.src = previewUrl;
            await preview.decode();
            if (revision !== backgroundRevision) return;
            await backgroundStore('put', file);
            if (revision !== backgroundRevision) return;
            showBackground(file);
            status.textContent = `Background saved: ${file.name}`;
        } catch {
            if (revision === backgroundRevision) status.textContent = 'Could not load or save this image. Try another image or check browser storage.';
        } finally {
            URL.revokeObjectURL(previewUrl);
            picker.disabled = false;
            picker.value = '';
        }
    });
    document.getElementById('background-fit').addEventListener('change', event => {
        settings.backgroundFit = event.target.value;
        applyBackgroundFit();
        saveSettings();
    });
    document.getElementById('background-remove').addEventListener('click', async () => {
        ++backgroundRevision;
        try {
            await backgroundStore('delete');
            showBackground(null);
            status.textContent = 'Background removed.';
        } catch {
            status.textContent = 'Could not remove the saved background. Please try again.';
        }
    });
    const revision = backgroundRevision;
    try {
        const blob = await backgroundStore('get');
        if (revision === backgroundRevision) showBackground(blob);
    } catch {
        if (revision === backgroundRevision) status.textContent = 'Saved backgrounds are unavailable in this browser.';
    }
}
