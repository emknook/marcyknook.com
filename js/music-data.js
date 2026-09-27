function youtubeVideoId(value) {
    if (!value) return '';
    if (/^[\w-]{11}$/.test(value)) return value;
    let url;
    try { url = new URL(value); } catch { throw new Error('Use a valid YouTube link.'); }
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Use an HTTP or HTTPS YouTube link.');
    const host = url.hostname.replace(/^www\./, '');
    let id = '';
    if (host === 'youtu.be') id = url.pathname.split('/')[1];
    else if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(host)) {
        id = url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] || '';
    }
    if (!/^[\w-]{11}$/.test(id)) throw new Error('The YouTube link needs a valid video ID.');
    return id;
}

function normalizeSong(raw, fallbackPlaylist = 'Main') {
    if (!raw || typeof raw !== 'object') throw new Error('Each song must be a record.');
    const fields = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key.trim().toLowerCase().replace(/[ _-]/g, ''), value]));
    const artist = String(fields.artist ?? fields.band ?? '').trim();
    const title = String(fields.title ?? fields.songtitle ?? fields.song ?? '').trim();
    const year = String(fields.year ?? fields.releaseyear ?? '').trim();
    const id = String(fields.id || crypto.randomUUID()).trim();
    const playlist = String(fields.playlist || fallbackPlaylist).trim();
    if (!artist || !title || (year && !/^\d{4}$/.test(year))) throw new Error('Artist and title are required. Release year must be blank or four digits.');
    if (artist.length > 160 || title.length > 200 || id.length > 80 || playlist.length > 80) throw new Error('A song field is too long (artist 160, title 200, ID/playlist 80 characters).');
    return { id, artist, title, year, playlist, youtube: youtubeVideoId(String(fields.youtube ?? fields.youtubelink ?? fields.link ?? '').trim()) };
}

function parseSongCSV(source) {
    const rows = []; let row = [], field = '', quoted = false;
    source = source.replace(/^\uFEFF/, '');
    for (let index = 0; index < source.length; index++) {
        const char = source[index];
        if (char === '"') {
            if (quoted && source[index + 1] === '"') { field += '"'; index++; }
            else if (quoted || !field) quoted = !quoted;
            else throw new Error('Invalid quote in CSV. Wrap fields containing quotes in double quotes.');
        } else if (char === ',' && !quoted) { row.push(field); field = ''; }
        else if ((char === '\n' || char === '\r') && !quoted) {
            if (char === '\r' && source[index + 1] === '\n') index++;
            row.push(field); if (row.some(value => value.trim())) rows.push(row);
            row = []; field = '';
        } else field += char;
    }
    if (quoted) throw new Error('CSV contains an unclosed quoted field.');
    row.push(field); if (row.some(value => value.trim())) rows.push(row);
    if (rows.length < 2) throw new Error('CSV needs a header and at least one song.');
    const headers = rows.shift().map(header => header.trim());
    if (new Set(headers.map(header => header.toLowerCase())).size !== headers.length) throw new Error('CSV headers must be unique.');
    return rows.map((values, index) => {
        if (values.length !== headers.length) throw new Error(`CSV row ${index + 2} has ${values.length} fields; expected ${headers.length}.`);
        return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
    });
}

function parseSongImport(source, filename, playlist) {
    let records;
    if (/\.json$/i.test(filename)) {
        const json = JSON.parse(source);
        records = Array.isArray(json) ? json : json.songs;
    } else records = parseSongCSV(source);
    if (!Array.isArray(records) || !records.length) throw new Error('No songs found in the import.');
    if (records.length > 5000) throw new Error('Import at most 5,000 songs at a time.');
    const seen = new Set();
    return records.map((record, index) => {
        let song;
        try { song = normalizeSong(record, playlist); } catch (error) { throw new Error(`Song ${index + 1}: ${error.message}`); }
        if (seen.has(song.id)) throw new Error(`Duplicate song ID in import: ${song.id}`);
        seen.add(song.id); return song;
    });
}

function encodeSongLink(song, base) {
    const url = new URL(base);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Choose an HTTP or HTTPS website URL.');
    const record = [song.id, song.artist, song.title, song.year, song.youtube];
    const bytes = new TextEncoder().encode(JSON.stringify(record));
    const payload = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    url.hash = 'music=' + payload;
    if (url.href.length > 2200) throw new Error('This link is too long for a practical QR code. Shorten the song fields or website URL.');
    return url.href;
}

function decodeSongLink(hash) {
    if (!hash.startsWith('#music=')) return null;
    const payload = hash.slice(7);
    if (payload.length > 3000 || !/^[\w-]+$/.test(payload)) throw new Error('Invalid music link.');
    const bytes = Uint8Array.from(atob(payload.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
    const values = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!Array.isArray(values) || values.length !== 5) throw new Error('Invalid music link.');
    return normalizeSong({ id: values[0], artist: values[1], title: values[2], year: values[3], youtube: values[4], playlist: 'Shared song' });
}
