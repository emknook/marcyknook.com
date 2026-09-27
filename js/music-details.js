// Suggestions stay separate from editable values until the user applies a match.
function addMusicDetailsLookup(row) {
    const cell = document.createElement('td');
    cell.className = 'music-details-lookup';
    const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Find song details';
    const output = document.createElement('div'); output.setAttribute('aria-live', 'polite');
    cell.append(button, output); row.append(cell);
    const fields = () => Object.fromEntries(['artist', 'title', 'year'].map(key => [key, row.querySelector(`[data-field="${key}"]`)]));
    button.addEventListener('click', async () => {
        const inputs = fields();
        // Remove upload labels, but retain live/remix/cover qualifiers that identify the recording.
        const title = inputs.title.value.replace(/\s*[\[(](?:official\s+(?:music\s+)?(?:video|audio)|lyrics?(?:\s+video)?|HD|4K)[\])]\s*/gi, ' ').trim();
        if (!title) { output.textContent = 'Enter a title first.'; return; }
        const snapshot = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value]));
        button.disabled = true; output.textContent = 'Looking for recordings…';
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 45000);
        try {
            const artist = inputs.artist.value.trim();
            async function search(searchArtist) {
                const query = new URLSearchParams({ title, artist: searchArtist });
                for (let attempt = 0; attempt < 3; attempt++) {
                    const response = await fetch('api/musicbrainz.php?' + query, { signal: controller.signal, credentials: 'same-origin' });
                    if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Upload the MusicBrainz PHP endpoint to use this lookup.');
                    const data = await response.json();
                    if (!response.ok) {
                        if (attempt < 2 && (data.retryable || (response.status === 429 && response.headers.get('retry-after')))) {
                            output.textContent = 'Lookup service busy. Retrying shortly…';
                            await musicLookupDelay(3000, controller.signal); continue;
                        }
                        throw new Error(data.error || 'Lookup failed. Try again later.');
                    }
                    if (!Array.isArray(data.matches)) throw new Error('Unexpected lookup response.');
                    return data;
                }
            }
            let data = await search(artist), broader = false;
            if (!data.matches.length && artist) {
                output.textContent = 'No artist match. Searching by title only…';
                await musicLookupDelay(1200, controller.signal);
                data = await search(''); broader = true;
            }
            output.replaceChildren();
            if (!data.matches.length) { output.textContent = 'No matches. Try a simpler title or correct the artist, then search again.'; return; }
            const hint = document.createElement('p');
            hint.textContent = (broader ? 'Title-only results: the artist did not match. ' : '') + 'Possible matches — check the version. Year means first release of this recording, not the original composition or upload. Search rank is not a certainty rating.';
            output.append(hint);
            for (const match of data.matches) {
                if (!/^[a-f0-9-]{36}$/.test(match.id)) continue;
                const item = document.createElement('div'); item.className = 'music-details-match';
                const text = document.createElement('p');
                text.textContent = `${match.artist} — ${match.title} (${match.year || 'year unknown'})${match.note ? ' · ' + match.note : ''}`;
                const source = document.createElement('a'); source.href = 'https://musicbrainz.org/recording/' + match.id;
                source.textContent = 'Check source'; source.target = '_blank'; source.rel = 'noopener noreferrer';
                const apply = document.createElement('button'); apply.type = 'button'; apply.textContent = 'Use these details';
                apply.addEventListener('click', () => {
                    if (Object.entries(fields()).some(([key, input]) => input.value !== snapshot[key])) {
                        output.textContent = 'Your fields changed since this search. Search again to review against your latest edits.'; return;
                    }
                    for (const [key, input] of Object.entries(fields())) {
                        // Unknown metadata must never clear an existing value.
                        if (match[key]) input.value = String(match[key]).slice(0, input.maxLength);
                    }
                    output.replaceChildren();
                    const applied = document.createElement('p'); applied.textContent = 'Suggestion applied. You can still edit it before importing.';
                    const undo = document.createElement('button'); undo.type = 'button'; undo.textContent = 'Undo suggestion';
                    const appliedValues = Object.fromEntries(Object.entries(fields()).map(([key, input]) => [key, input.value]));
                    undo.addEventListener('click', () => {
                        for (const [key, input] of Object.entries(fields())) if (input.value === appliedValues[key]) input.value = snapshot[key];
                        output.replaceChildren();
                    });
                    output.append(applied, source, undo);
                });
                item.append(text, source, apply); output.append(item);
            }
        } catch (error) { output.textContent = error.name === 'AbortError' ? 'Lookup timed out. Try again.' : error.message; }
        finally { clearTimeout(timer); button.disabled = false; }
    });
}

function musicLookupDelay(ms, signal) {
    return new Promise((resolve, reject) => {
        const abort = () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); };
        const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
        if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
    });
}
