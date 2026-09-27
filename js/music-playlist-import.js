function youtubePlaylistId(value) {
    let url;
    try { url = new URL(value); } catch { throw new Error('Paste a YouTube or YouTube Music playlist URL.'); }
    const host = url.hostname.replace(/^www\./, '');
    const id = url.searchParams.get('list');
    if (!['https:', 'http:'].includes(url.protocol) || !['youtube.com', 'music.youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)
        || !id || !/^[\w-]{10,100}$/.test(id)) throw new Error('The link must contain a YouTube playlist ID (list=…).');
    return id;
}

function playlistTrackSuggestion(item) {
    const snippet = item.snippet || {};
    const video = item.contentDetails?.videoId || snippet.resourceId?.videoId;
    if (!/^[\w-]{11}$/.test(video || '') || !snippet.title || ['Deleted video', 'Private video'].includes(snippet.title)) return null;
    let title = snippet.title, artist = (snippet.videoOwnerChannelTitle || '').replace(/\s*-\s*Topic$/, '').trim();
    const split = title.match(/^(.+?)\s+[-–—]\s+(.+)$/);
    if (split) { artist = split[1].trim(); title = split[2].trim(); }
    return { youtube: video, artist: artist.slice(0, 160), title: title.slice(0, 200), year: '' };
}

async function fetchServerYouTubePlaylist(playlistId, signal) {
    const response = await fetch('api/youtube-playlist.php?playlistId=' + encodeURIComponent(playlistId), { signal, credentials: 'same-origin' });
    if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('The playlist backend is unavailable. Open the PHP-hosted website and check that the api folder was uploaded.');
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'The playlist service could not load this list.');
    if (!Array.isArray(data.items)) throw new Error('The playlist service returned an unexpected response.');
    const tracks = [], videos = new Set(); let skipped = 0;
    for (const item of data.items) {
        const track = playlistTrackSuggestion(item);
        if (!track || videos.has(track.youtube)) { skipped++; continue; }
        videos.add(track.youtube); tracks.push(track);
    }
    return { tracks, skipped };
}

function initializeYouTubePlaylistImport() {
    const element = id => document.getElementById(id);
    const status = message => { element('youtube-playlist-status').textContent = message; };
    let controller = null, drafts = [], destination = '';
    element('youtube-playlist-form').addEventListener('submit', async event => {
        event.preventDefault();
        if (controller) return;
        drafts = []; element('youtube-playlist-review').hidden = true;
        let timeout;
        try {
            const id = youtubePlaylistId(element('youtube-playlist-url').value);
            destination = element('youtube-playlist-name').value.trim();
            if (!destination) throw new Error('Enter a destination playlist name.');
            controller = new AbortController();
            const activeController = controller;
            timeout = setTimeout(() => activeController.abort(), 60000);
            element('youtube-playlist-fetch').disabled = true;
            element('youtube-playlist-cancel').hidden = false;
            status('Loading playlist…');
            const result = await fetchServerYouTubePlaylist(id, controller.signal);
            drafts = result.tracks.map(track => {
                const existing = musicData.songs.find(song => song.youtube === track.youtube && song.playlist === destination);
                return existing ? { ...existing } : { ...track, id: `yt-${track.youtube}-${crypto.randomUUID()}`, playlist: destination };
            });
            if (!drafts.length) { status('No accessible songs found in this playlist.'); return; }
            const body = element('youtube-playlist-tracks'); body.replaceChildren();
            drafts.forEach((track, index) => {
                const row = document.createElement('tr');
                const includeCell = document.createElement('td'), include = document.createElement('input');
                include.type = 'checkbox'; include.checked = true; include.setAttribute('aria-label', `Include song ${index + 1}`);
                includeCell.append(include); row.append(includeCell);
                for (const field of ['artist', 'title', 'year']) {
                    const cell = document.createElement('td'), input = document.createElement('input');
                    input.value = track[field]; input.dataset.field = field;
                    input.setAttribute('aria-label', `${field} for song ${index + 1}`);
                    input.maxLength = field === 'year' ? 4 : field === 'artist' ? 160 : 200;
                    if (field === 'year') { input.inputMode = 'numeric'; input.placeholder = 'Unknown'; }
                    cell.append(input); row.append(cell);
                }
                const videoCell = document.createElement('td'), link = document.createElement('a');
                link.href = 'https://www.youtube.com/watch?v=' + track.youtube;
                link.textContent = track.youtube; link.target = '_blank'; link.rel = 'noopener noreferrer';
                videoCell.append(link); row.append(videoCell);
                addMusicDetailsLookup(row);
                body.append(row);
            });
            element('youtube-playlist-review').hidden = false;
            status(`${drafts.length} songs ready to review. ${result.skipped} unavailable or duplicate entries skipped. ${result.notice || ""} Nothing imported yet.`);
        } catch (error) {
            status(error.name === 'AbortError' ? 'Loading cancelled or timed out. No songs were imported.'
                : error instanceof TypeError ? 'Could not contact the playlist service. Check your connection and try again.' : error.message);
        } finally {
            clearTimeout(timeout); controller = null;
            element('youtube-playlist-fetch').disabled = false;
            element('youtube-playlist-cancel').hidden = true;
        }
    });
    element('youtube-playlist-cancel').addEventListener('click', () => controller?.abort());
    element('youtube-playlist-review').addEventListener('submit', event => {
        event.preventDefault();
        try {
            const selected = [];
            [...element('youtube-playlist-tracks').children].forEach((row, index) => {
                if (!row.querySelector('input[type="checkbox"]').checked) return;
                const values = Object.fromEntries([...row.querySelectorAll('[data-field]')].map(input => [input.dataset.field, input.value]));
                try { selected.push(normalizeSong({ ...drafts[index], ...values })); }
                catch (error) { throw new Error(`Song ${index + 1}: ${error.message}`); }
            });
            if (!selected.length) throw new Error('Select at least one song to import.');
            const previousSongs = musicData.songs, previousPlaylist = musicData.playlist;
            const merged = new Map(musicData.songs.map(song => [song.id, song]));
            selected.forEach(song => merged.set(song.id, song));
            musicData.songs = [...merged.values()]; musicData.playlist = destination;
            if (!saveMusic()) {
                musicData.songs = previousSongs; musicData.playlist = previousPlaylist;
                throw new Error('Could not save the import. Free some browser storage or export your library first.');
            }
            renderMusicLibrary(); element('song-playlist').value = destination;
            status(`Imported ${selected.length} songs into ${destination}. Blank years can be added later using Edit.`);
            element('youtube-playlist-review').hidden = true; drafts = [];
        } catch (error) { status(error.message); }
    });
}
