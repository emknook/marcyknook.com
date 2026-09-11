// A small, deliberately HTML-free Markdown subset. All user text is escaped.
function escapeNoteHTML(text) {
    return String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function noteInlineMarkdown(text) {
    const tokens = /`([^`]+)`|\[([^\]]+)\]\(([^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|~~([^~]+)~~/g;
    let result = '', end = 0;
    for (const match of text.matchAll(tokens)) {
        result += escapeNoteHTML(text.slice(end, match.index));
        if (match[1]) result += `<code>${escapeNoteHTML(match[1])}</code>`;
        else if (match[2]) {
            const safe = /^(https?:\/\/|mailto:)/i.test(match[3]);
            result += safe ? `<a href="${escapeNoteHTML(match[3])}" target="_blank" rel="noopener noreferrer">${escapeNoteHTML(match[2])}</a>` : escapeNoteHTML(match[0]);
        } else if (match[4]) result += `<strong>${escapeNoteHTML(match[4])}</strong>`;
        else if (match[5]) result += `<em>${escapeNoteHTML(match[5])}</em>`;
        else result += `<del>${escapeNoteHTML(match[6])}</del>`;
        end = match.index + match[0].length;
    }
    return result + escapeNoteHTML(text.slice(end));
}

function renderNoteMarkdown(source) {
    const lines = source.replace(/\r\n?/g, '\n').split('\n');
    const output = [];
    let list = null, code = null;
    const closeList = () => { if (list) output.push(`</${list}>`); list = null; };
    for (const line of lines) {
        if (/^\s*```/.test(line)) {
            closeList();
            if (code) { output.push(`<pre><code>${escapeNoteHTML(code.join('\n'))}</code></pre>`); code = null; }
            else code = [];
            continue;
        }
        if (code) { code.push(line); continue; }
        const bullet = line.match(/^\s*(?:[-*+] |\d+\. )(.*)$/);
        if (bullet) {
            const type = /^\s*\d+\./.test(line) ? 'ol' : 'ul';
            if (list !== type) { closeList(); list = type; output.push(`<${type}>`); }
            const task = bullet[1].match(/^\[([ xX])\] (.*)$/);
            output.push(task ? `<li class="note-task">${task[1] === ' ' ? '☐' : '☑'} ${noteInlineMarkdown(task[2])}</li>` : `<li>${noteInlineMarkdown(bullet[1])}</li>`);
            continue;
        }
        closeList();
        const heading = line.match(/^(#{1,6})\s+(.+)$/);
        if (heading) output.push(`<h${heading[1].length}>${noteInlineMarkdown(heading[2])}</h${heading[1].length}>`);
        else if (/^\s*---+\s*$/.test(line)) output.push('<hr>');
        else if (/^>\s?/.test(line)) output.push(`<blockquote>${noteInlineMarkdown(line.replace(/^>\s?/, ''))}</blockquote>`);
        else if (line.trim()) output.push(`<p>${noteInlineMarkdown(line)}</p>`);
    }
    closeList();
    if (code) output.push(`<pre><code>${escapeNoteHTML(code.join('\n'))}</code></pre>`);
    return output.join('\n');
}
