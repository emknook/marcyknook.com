let musicCameraStream = null, musicScanTimer = null, musicScanRevision = 0;

function songFromScannedCode(value) {
    let hash;
    if (value.startsWith('#music=')) hash = value;
    else {
        let url;
        try { url = new URL(value); } catch { throw new Error('This is not a Music Quiz song card.'); }
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('This is not a Music Quiz song card.');
        hash = url.hash;
    }
    let song;
    try { song = decodeSongLink(hash); } catch { throw new Error('This song card is damaged or incomplete.'); }
    if (!song?.youtube) throw new Error('This QR code does not contain a playable Music Quiz song.');
    return song;
}

function stopMusicScanner() {
    musicScanRevision++;
    clearTimeout(musicScanTimer); musicScanTimer = null;
    musicCameraStream?.getTracks().forEach(track => track.stop());
    musicCameraStream = null;
    const video = document.getElementById('music-camera');
    video.pause(); video.srcObject = null; video.hidden = true;
    musicElement('music-camera-start').disabled = false;
    musicElement('music-camera-stop').hidden = true;
}

function openScannedMusicCode(value) {
    // Read only the song payload. Never navigate to a scanned URL.
    const song = songFromScannedCode(value);
    stopMusicScanner();
    musicElement('music-scanner').open = false;
    openApp('music', true); startMusicRound(song);
    musicElement('music-scan-status').textContent = 'Song card scanned. Camera stopped.';
    musicElement('music-reveal').focus();
}

async function startMusicScanner() {
    stopMusicScanner();
    const revision = musicScanRevision;
    const status = musicElement('music-scan-status');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        status.textContent = 'Camera access needs HTTPS or localhost and a supported browser. You can upload a QR image instead.';
        return;
    }
    musicElement('music-camera-start').disabled = true;
    musicElement('music-camera-stop').hidden = false;
    status.textContent = 'Allow camera access to scan a song card.';
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
        if (revision !== musicScanRevision) { stream.getTracks().forEach(track => track.stop()); return; }
        musicCameraStream = stream;
        const video = musicElement('music-camera');
        video.srcObject = stream; video.hidden = false;
        await video.play();
        if (revision !== musicScanRevision) return;
        status.textContent = 'Hold a song card steady inside the camera view.';
        const canvas = document.createElement('canvas'), context = canvas.getContext('2d', { willReadFrequently: true });
        const scan = () => {
            if (revision !== musicScanRevision) return;
            try {
                if (video.readyState >= 2 && video.videoWidth) {
                    const scale = Math.min(1, 960 / video.videoWidth);
                    canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
                    const result = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' });
                    if (result) {
                        try { openScannedMusicCode(result.data); return; }
                        catch (error) { status.textContent = error.message; }
                    }
                }
            } catch {
                stopMusicScanner(); status.textContent = 'Could not read the camera. Try a QR image instead.'; return;
            }
            musicScanTimer = setTimeout(scan, 180);
        };
        scan();
    } catch (error) {
        if (revision !== musicScanRevision) return;
        stopMusicScanner();
        status.textContent = error.name === 'NotAllowedError'
            ? 'Camera access was denied. Allow it in your browser, or upload a QR image.'
            : 'Camera unavailable or already in use. Try again, or upload a QR image.';
    }
}

function initializeMusicScanner() {
    musicElement('music-camera-start').addEventListener('click', startMusicScanner);
    musicElement('music-camera-stop').addEventListener('click', () => {
        stopMusicScanner(); musicElement('music-scan-status').textContent = 'Camera stopped.';
    });
    musicElement('music-scanner').addEventListener('toggle', () => {
        if (!musicElement('music-scanner').open) stopMusicScanner();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopMusicScanner(); });
    window.addEventListener('pagehide', stopMusicScanner);
    musicElement('music-qr-upload').addEventListener('change', async event => {
        const file = event.target.files[0]; if (!file) return;
        stopMusicScanner();
        const revision = musicScanRevision;
        const status = musicElement('music-scan-status');
        let imageUrl;
        try {
            if (file.size > 20 * 1024 * 1024) throw new Error('Choose an image under 20 MB.');
            status.textContent = 'Reading QR image…';
            imageUrl = URL.createObjectURL(file);
            const image = new Image(); image.src = imageUrl; await image.decode();
            if (revision !== musicScanRevision) return;
            const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
            const context = canvas.getContext('2d'); context.drawImage(image, 0, 0, canvas.width, canvas.height);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' });
            if (!result) throw new Error('No QR code found. Try a clear crop of one card.');
            openScannedMusicCode(result.data);
        } catch (error) {
            if (revision === musicScanRevision) status.textContent = error.message || 'Could not read this QR image.';
        } finally { if (imageUrl) URL.revokeObjectURL(imageUrl); event.target.value = ''; }
    });
}
