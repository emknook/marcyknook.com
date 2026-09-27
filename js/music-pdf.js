// Small vector-only PDF writer: QR modules stay sharp at any print resolution.
// All PDF syntax and labels are ASCII, so string lengths equal byte offsets.
function buildMusicCardsPDF(songs, baseUrl, duplex = "single") {
    if (!["single", "long", "short"].includes(duplex)) throw new Error("Choose a valid print layout.");
    if (!songs.length) throw new Error('No playable songs in this playlist.');
    const objects = [null, '', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
    const pages = [];
    const number = value => Number(value.toFixed(3));
    const text = (x, y, size, value) => `BT /F1 ${size} Tf ${number(x)} ${number(y)} Td (${value}) Tj ET\n`;
    const pageCount = Math.ceil(songs.length / 12);
    for (let page = 0; page < pageCount; page++) {
        let drawing = '0 g\n';
        for (let slot = 0; slot < 12; slot++) {
            const index = page * 12 + slot;
            if (index >= songs.length) break;
            const qr = qrcode(0, 'M');
            qr.addData(encodeSongLink(songs[index], baseUrl)); qr.make();
            const x = 28 + (slot % 3) * 182;
            const y = 624 - Math.floor(slot / 3) * 198;
            drawing += `0.75 G 0.5 w ${x} ${y} 174 190 re S\n0 g\n`;
            drawing += text(x + 80.8, y + 9, 8, 'MK');
            const count = qr.getModuleCount();
            const cell = 152 / (count + 8); // Four clear modules on every side.
            const left = x + 11 + 4 * cell, bottom = y + 24 + 4 * cell;
            for (let row = 0; row < count; row++) {
                // Merge adjacent dark modules into runs to keep the file small.
                for (let col = 0; col < count; col++) {
                    if (!qr.isDark(row, col)) continue;
                    const start = col;
                    while (col + 1 < count && qr.isDark(row, col + 1)) col++;
                    drawing += `${number(left + start * cell)} ${number(bottom + (count - row - 1) * cell)} ${number((col - start + 1) * cell)} ${number(cell)} re f\n`;
                }
            }
        }
        const contentId = objects.length;
        objects.push(`<< /Length ${drawing.length} >>\nstream\n${drawing}endstream`);
        const pageId = objects.length;
        objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.276 841.89] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
        pages.push(`${pageId} 0 R`);
        if (duplex !== 'single') {
            let back = '0 g\n'; const images = [];
            for (let slot = 0; slot < 12 && page * 12 + slot < songs.length; slot++) {
                const frontX = 28 + (slot % 3) * 182, frontY = 624 - Math.floor(slot / 3) * 198;
                const x = duplex === 'long' ? 595.276 - frontX - 174 : frontX;
                const y = duplex === 'short' ? 841.89 - frontY - 190 : frontY;
                const jpeg = musicAnswerImage(songs[page * 12 + slot]);
                const imageId = objects.length;
                objects.push(`<< /Type /XObject /Subtype /Image /Width 696 /Height 760 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${jpeg.length + 1} >>\nstream\n${jpeg}>\nendstream`);
                images.push(`/A${slot} ${imageId} 0 R`);
                back += `q 174 0 0 190 ${number(x)} ${number(y)} cm /A${slot} Do Q\n0.75 G 0.5 w ${number(x)} ${number(y)} 174 190 re S\n`;
            }
            const content = objects.length;
            objects.push(`<< /Length ${back.length} >>\nstream\n${back}endstream`);
            const backPage = objects.length;
            objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.276 841.89] /Resources << /XObject << ${images.join(' ')} >> >> /Contents ${content} 0 R >>`);
            pages.push(`${backPage} 0 R`);
        }
    }
    objects[1] = `<< /Type /Catalog /Pages 2 0 R /ViewerPreferences << /PrintScaling /None /Duplex /${duplex === 'long' ? 'DuplexFlipLongEdge' : duplex === 'short' ? 'DuplexFlipShortEdge' : 'Simplex'} >> >>`;
    objects[2] = `<< /Type /Pages /Kids [${pages.join(' ')}] /Count ${pages.length} >>`;
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (let index = 1; index < objects.length; index++) {
        offsets.push(pdf.length); pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
    }
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return new TextEncoder().encode(pdf);
}

function exportMusicCardsPDF() {
    const songs = musicData.songs.filter(song => song.playlist === musicData.playlist && song.youtube);
    try {
        const duplex = musicElement('music-pdf-layout').value;
        const pdf = buildMusicCardsPDF(songs, musicElement('music-base-url').value, duplex);
        const filename = musicData.playlist.replace(/[^a-z0-9_-]/gi, '_') || 'playlist';
        downloadMusicFile(`${filename}-qr-cards.pdf`, pdf, 'application/pdf');
        const skipped = musicData.songs.filter(song => song.playlist === musicData.playlist && !song.youtube).length;
        musicStatus(`Exported ${songs.length} QR cards on ${Math.ceil(songs.length / 12) * (duplex === 'single' ? 1 : 2)} A4 pages.${duplex === 'single' ? '' : ' Print double-sided, flip on the ' + duplex + ' edge, at actual size (100%).'}`
            + (skipped ? ` Skipped ${skipped} songs without YouTube links.` : ''));
    } catch (error) { musicStatus(error.message || 'Could not export the QR cards.'); }
}

function musicAnswerImage(song) {
    const canvas = document.createElement('canvas'); canvas.width = 696; canvas.height = 760;
    const ctx = canvas.getContext('2d'); ctx.scale(4, 4);
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 174, 190); ctx.fillStyle = '#171717';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    function block(value, top, height, initialSize, weight) {
        let lines, size = initialSize;
        do {
            ctx.font = weight + ' ' + size + 'px Arial, sans-serif'; lines = []; let line = '';
            for (const word of String(value).trim().split(/\s+/)) {
                const candidate = line ? line + ' ' + word : word;
                if (ctx.measureText(candidate).width <= 148) { line = candidate; continue; }
                if (line) { lines.push(line); line = ''; }
                for (const char of Array.from(word)) {
                    if (line && ctx.measureText(line + char).width > 148) { lines.push(line); line = ''; }
                    line += char;
                }
            }
            if (line) lines.push(line.trim());
            if (lines.length * size * 1.25 <= height || size <= 4) break;
            size -= .5;
        } while (true);
        const y = top + (height - lines.length * size * 1.25) / 2;
        lines.forEach((line, i) => ctx.fillText(line, 87, y + i * size * 1.25));
    }
    block(song.title || 'Title unknown', 18, 57, 16, 'bold');
    block(song.artist || 'Artist unknown', 80, 42, 12, 'normal');
    block(song.year || 'Year unknown', 133, 27, 21, 'bold');
    ctx.font = '8px Arial, sans-serif'; ctx.fillText('MK', 87, 173);
    const binary = atob(canvas.toDataURL('image/jpeg', .95).split(',')[1]);
    return Array.from(binary, char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
}
