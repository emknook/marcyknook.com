const musicStorageKey = 'portfolioMusic.v1';
let musicData = { songs: [], playlist: 'Main', baseUrl: 'https://marcyknook.com/', deleted: null };
let musicStorageReady = true, musicCurrentSong = null, musicPendingImport = null, musicQrSvg = '';
const musicElement = id => document.getElementById(id);
const musicStatus = message => { musicElement('music-status').textContent = message; };

function saveMusic() {
    try {
        if (!musicStorageReady) throw new Error('Storage could not be read');
        localStorage.setItem(musicStorageKey, JSON.stringify(musicData));
        return true;
    } catch {
        musicStatus('Changes are not saved. Browser storage is full or unavailable; export your library before leaving.');
        return false;
    }
}

function initializeMusic() {
    initializeMusicScanner();
    initializeYouTubePlaylistImport();
    musicElement('music-pdf-export').addEventListener('click', exportMusicCardsPDF);
    try {
        const raw = localStorage.getItem(musicStorageKey);
        if (raw) {
            const saved = JSON.parse(raw);
            if (!Array.isArray(saved.songs)) throw new Error('Invalid library');
            musicData = { songs: saved.songs.map(song => normalizeSong(song)), playlist: String(saved.playlist || 'Main'),
                baseUrl: saved.baseUrl || 'https://marcyknook.com/', deleted: saved.deleted ? normalizeSong(saved.deleted) : null };
        }
    } catch { musicStorageReady = false; musicStatus('The saved library could not be read. Existing storage was left intact.'); }
    musicElement('music-base-url').value = musicData.baseUrl;
    musicElement('music-playlist').addEventListener('change', event => {
        musicData.playlist = event.target.value; musicElement('song-playlist').value = musicData.playlist;
        saveMusic(); renderMusicLibrary();
    });
    musicElement('music-search').addEventListener('input', renderMusicLibrary);
    for (const id of ['music-random', 'music-next-random']) musicElement(id).addEventListener('click', randomMusicSong);
    for (const id of ['music-scan', 'music-next-scan']) musicElement(id).addEventListener('click', beginMusicScan);
    musicElement('music-setup').addEventListener('click', () => {
        musicElement('music-configuration').open = true;
        musicElement('music-library').open = true;
        musicElement('music-library').scrollIntoView({ block: 'start' });
    });
    musicElement('music-play').addEventListener('click', () => {
        if (musicPlayerReady) musicPlayer.playVideo(); else playMusicSong();
    });
    musicElement('music-pause').addEventListener('click', () => {
        if (musicPlayerReady) musicPlayer.pauseVideo();
        else { musicPendingPause = true; musicStatus('Pause requested. If controls cannot connect, use Stop playback.'); }
    });
    musicElement('music-restart').addEventListener('click', playMusicSong);
    musicElement('music-stop').addEventListener('click', stopMusicPlayback);
    musicElement('music-player-details').addEventListener('toggle', () => {
        musicElement('music-player-host').classList.toggle('music-player-hidden', !musicElement('music-player-details').open);
    });
    musicElement('music-reveal').addEventListener('click', () => {
        if (!musicCurrentSong) return;
        const answer = musicElement('music-answer'); answer.replaceChildren();
        for (const [label, value] of [['Artist / band', musicCurrentSong.artist], ['Song title', musicCurrentSong.title], ['Year', musicCurrentSong.year]]) {
            const paragraph = document.createElement('p'); paragraph.textContent = `${label}: ${value || 'Not set'}`; answer.append(paragraph);
        }
        answer.hidden = false;
        musicElement('music-reveal').hidden = true;
        musicElement('music-next').hidden = false;
        musicElement('music-round-step').textContent = 'The answer';
        musicElement('music-round-heading').textContent = 'How did you do?';
    });
    musicElement('music-song-form').addEventListener('submit', event => {
        event.preventDefault();
        try {
            const song = normalizeSong(Object.fromEntries(['id', 'artist', 'title', 'year', 'youtube', 'playlist'].map(field => [field, musicElement('song-' + field).value])));
            const index = musicData.songs.findIndex(item => item.id === song.id);
            if (index < 0) musicData.songs.push(song); else musicData.songs[index] = song;
            musicData.playlist = song.playlist;
            if (saveMusic()) musicStatus(index < 0 ? 'Song added.' : 'Song updated.');
            musicElement('music-song-form').reset(); musicElement('song-playlist').value = song.playlist;
            renderMusicLibrary();
        } catch (error) { musicStatus(error.message); }
    });
    musicElement('music-form-clear').addEventListener('click', () => {
        musicElement('music-song-form').reset(); musicElement('song-playlist').value = musicData.playlist;
    });
    musicElement('music-import').addEventListener('change', async event => {
        const file = event.target.files[0]; if (!file) return;
        musicPendingImport = null; musicElement('music-import-preview').hidden = true;
        try {
            if (file.size > 5 * 1024 * 1024) throw new Error('Choose an import under 5 MB.');
            musicPendingImport = parseSongImport(await file.text(), file.name, musicData.playlist);
            const updates = musicPendingImport.filter(song => musicData.songs.some(item => item.id === song.id)).length;
            musicElement('music-import-summary').textContent = `${musicPendingImport.length} songs: ${musicPendingImport.length - updates} new, ${updates} updates. Preview: `
                + musicPendingImport.slice(0, 5).map(song => `${song.artist} — ${song.title} (${song.year})`).join('; ');
            musicElement('music-import-preview').hidden = false;
        } catch (error) { musicStatus(error.message); }
        event.target.value = '';
    });
    musicElement('music-import-apply').addEventListener('click', () => {
        if (!musicPendingImport) return;
        const merged = new Map(musicData.songs.map(song => [song.id, song]));
        musicPendingImport.forEach(song => merged.set(song.id, song));
        musicData.songs = [...merged.values()]; musicData.playlist = musicPendingImport[0].playlist;
        if (saveMusic()) musicStatus(`Imported ${musicPendingImport.length} songs.`);
        musicPendingImport = null; musicElement('music-import-preview').hidden = true; renderMusicLibrary();
    });
    musicElement('music-import-cancel').addEventListener('click', () => {
        musicPendingImport = null; musicElement('music-import-preview').hidden = true;
    });
    musicElement('music-template').addEventListener('click', () => downloadMusicFile('music-template.csv', 'id,artist,title,year,youtube,playlist\r\n', 'text/csv'));
    musicElement('music-export').addEventListener('click', () => downloadMusicFile('music-library.json', JSON.stringify({ songs: musicData.songs }, null, 2), 'application/json'));
    musicElement('music-undo').addEventListener('click', () => {
        if (!musicData.deleted) return;
        if (musicData.songs.some(song => song.id === musicData.deleted.id)) { musicStatus('That song ID is already in your library.'); return; }
        musicData.songs.push(musicData.deleted); musicData.playlist = musicData.deleted.playlist; musicData.deleted = null;
        saveMusic(); renderMusicLibrary();
    });
    musicElement('music-base-url').addEventListener('change', () => {
        try {
            const url = new URL(musicElement('music-base-url').value);
            if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an HTTP or HTTPS website URL.');
            url.hash = ''; musicData.baseUrl = url.href; saveMusic();
            musicElement('music-qr').hidden = true;
        } catch { musicStatus('Enter a valid HTTP or HTTPS website URL.'); }
    });
    musicElement('music-qr-download').addEventListener('click', () => {
        if (musicQrSvg) downloadMusicFile('music-quiz-qr.svg', musicQrSvg, 'image/svg+xml');
    });
    musicElement('music-link-copy').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(musicElement('music-share-link').value); musicStatus('Link copied.'); }
        catch { musicElement('music-share-link').select(); musicStatus('Select and copy the share link manually.'); }
    });
    window.addEventListener('hashchange', loadSharedMusicSong);
    renderMusicLibrary(); loadSharedMusicSong();
}

function renderMusicLibrary() {
    const playlists = [...new Set(['Main', musicData.playlist, ...musicData.songs.map(song => song.playlist)])];
    const select = musicElement('music-playlist'); select.replaceChildren();
    playlists.forEach(playlist => { const option = document.createElement('option'); option.value = playlist; option.textContent = playlist; select.append(option); });
    select.value = musicData.playlist;
    const query = musicElement('music-search').value.trim().toLocaleLowerCase();
    const songs = musicData.songs.filter(song => song.playlist === musicData.playlist && `${song.artist} ${song.title} ${song.year} ${song.id}`.toLocaleLowerCase().includes(query));
    const body = musicElement('music-songs'); body.replaceChildren();
    songs.forEach(song => {
        const row = document.createElement('tr');
        for (const field of ['id', 'artist', 'title', 'year', 'playlist']) { const cell = document.createElement('td'); cell.textContent = song[field]; row.append(cell); }
        const actions = document.createElement('td');
        for (const [label, action] of [
            ['Edit', () => { for (const field of ['id', 'artist', 'title', 'year', 'playlist']) musicElement('song-' + field).value = song[field]; musicElement('song-youtube').value = song.youtube ? 'https://www.youtube.com/watch?v=' + song.youtube : ''; musicElement('song-artist').focus(); }],
            ['QR', () => showMusicQR(song)],
            ['Delete', () => { musicData.deleted = song; musicData.songs = musicData.songs.filter(item => item.id !== song.id); saveMusic(); renderMusicLibrary(); }]
        ]) { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.setAttribute('aria-label', `${label} ${song.title}`); button.addEventListener('click', action); actions.append(button); }
        row.append(actions); body.append(row);
    });
    if (!songs.length) { const row = document.createElement('tr'), cell = document.createElement('td'); cell.colSpan = 6; cell.textContent = 'No songs match this playlist and filter. Add a song or import a list.'; row.append(cell); body.append(row); }
    musicElement('music-undo').hidden = !musicData.deleted;
    musicElement('music-empty').hidden = musicData.songs.some(song => song.playlist === musicData.playlist && song.youtube);
}

function randomMusicSong() {
    let candidates = musicData.songs.filter(song => song.playlist === musicData.playlist && song.youtube);
    if (!candidates.length) { musicStatus('This playlist has no playable songs yet. Scan a card, or add songs under Manage playlists & QR cards.'); return; }
    if (candidates.length > 1) candidates = candidates.filter(song => song.id !== musicCurrentSong?.id);
    startMusicRound(candidates[Math.floor(Math.random() * candidates.length)]);
}

function beginMusicScan() {
    stopMusicPlayback();
    document.querySelector('.music-app').classList.remove('music-round-active');
    musicElement('music-round').hidden = true;
    musicElement('music-configuration').open = false;
    musicElement('music-scanner').open = true;
    musicStatus('Scan your next card to start a new round.');
    startMusicScanner();
    musicElement('music-scanner').scrollIntoView({ block: 'start' });
}

function startMusicRound(song) {
    stopMusicScanner();
    musicElement('music-scanner').open = false;
    stopMusicPlayback(); musicCurrentSong = { ...song };
    document.querySelector('.music-app').classList.add('music-round-active');
    document.querySelector('.music-app').scrollTop = 0;
    musicElement('music-round').hidden = false; musicElement('music-answer').hidden = true; musicElement('music-answer').replaceChildren();
    musicElement('music-next').hidden = false;
    musicElement('music-reveal').hidden = false;
    musicElement('music-round-step').textContent = 'Listen & guess';
    musicElement('music-round-heading').textContent = 'What’s that song?';
    musicElement('music-configuration').open = false;
    musicElement('music-library').open = false; musicElement('music-sharing').open = false;
    musicElement('music-player-details').open = false; musicElement('music-player-host').classList.add('music-player-hidden');
    playMusicSong();
    musicElement('music-reveal').focus({ preventScroll: true });
}

function playMusicSong() {
    if (!musicCurrentSong?.youtube) { musicStatus('This record has no YouTube link.'); return; }
    stopMusicPlayback();
    const player = document.createElement('iframe');
    player.title = 'Mystery track player'; player.width = '320'; player.height = '200';
    player.allow = 'autoplay; encrypted-media; picture-in-picture';
    player.referrerPolicy = 'strict-origin-when-cross-origin';
    player.src = `https://www.youtube-nocookie.com/embed/${musicCurrentSong.youtube}?autoplay=1&playsinline=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
    musicElement('music-player-host').append(player);
    connectMusicPlayer(player);
    musicStatus('Song selected — listen and guess together. If playback doesn’t start, tap Play below.');
}

let musicPlayer = null, musicPlayerReady = false, musicPendingPause = false;
function connectMusicPlayer(frame) {
    if (!window.YT?.Player) {
        window.onYouTubeIframeAPIReady = () => {
            const current = musicElement('music-player-host').querySelector('iframe');
            if (current) connectMusicPlayer(current);
        };
        if (!document.getElementById('music-youtube-api')) {
            const script = document.createElement('script');
            script.id = 'music-youtube-api'; script.src = 'https://www.youtube.com/iframe_api';
            script.onerror = () => { script.remove(); musicStatus('Controls could not connect. Try Play again or use the YouTube player.'); };
            document.head.append(script);
        }
        return;
    }
    musicPlayer = new window.YT.Player(frame, { events: {
        onReady: event => {
            if (event.target !== musicPlayer) return;
            musicPlayerReady = true;
            if (musicPendingPause) { musicPendingPause = false; event.target.pauseVideo(); }
        }
    }});
}
function stopMusicPlayback() {
    const previous = musicPlayer;
    musicPlayer = null; musicPlayerReady = false; musicPendingPause = false;
    if (previous) previous.destroy();
    musicElement('music-player-host').replaceChildren();
}

function loadSharedMusicSong() {
    try {
        const song = decodeSongLink(location.hash);
        if (song) { openApp('music', true); snapWindowToZone(musicElement('music'), 'full'); startMusicRound(song); }
    } catch { openApp('music', true); musicStatus('This music link is invalid or incomplete. Ask for a new QR card.'); }
}

function showMusicQR(song) {
    try {
        if (!song.youtube) throw new Error('Add a YouTube link before making a playable QR card.');
        const link = encodeSongLink(song, musicElement('music-base-url').value);
        const qr = qrcode(0, 'M'); qr.addData(link); qr.make();
        musicQrSvg = qr.createSvgTag({ cellSize: 4, margin: 16, scalable: true });
        musicElement('music-qr-image').innerHTML = musicQrSvg;
        musicElement('music-share-link').value = link;
        musicElement('music-qr-label').textContent = `Song card · ${song.id}`;
        musicElement('music-qr').hidden = false; musicElement('music-configuration').open = true; musicElement('music-sharing').open = true;
        musicElement('music-sharing').scrollIntoView({ block: 'nearest' });
    } catch (error) { musicStatus(error.message || 'Could not generate this QR code.'); }
}

function downloadMusicFile(filename, content, type) {
    const link = document.createElement('a'), url = URL.createObjectURL(new Blob([content], { type }));
    link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
