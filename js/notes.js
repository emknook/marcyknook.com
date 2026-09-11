const notesStorageKey = 'portfolioNotes.v1';
let notesData = { items: [], activeId: null, deleted: null, widget: { enabled: true, x: 78, y: 5 } };
let notesStorageReady = true;
let notesPreview = false;
const noteColors = ['yellow', 'pink', 'blue', 'green'];
const noteElement = id => document.getElementById(id);
const activeNote = () => notesData.items.find(note => note.id === notesData.activeId);

function saveNotes() {
    try {
        if (!notesStorageReady) throw new Error('Existing notes could not be read');
        localStorage.setItem(notesStorageKey, JSON.stringify(notesData));
        noteElement('notes-status').textContent = 'Saved in this browser · Export a copy for a backup.';
    } catch {
        noteElement('notes-status').textContent = 'Not saved: browser storage is unavailable or full. Export your work before leaving.';
    }
}

function normalizeNote(note) {
    if (!note || typeof note.id !== 'string' || typeof note.body !== 'string') throw new Error('Invalid note');
    return { id: note.id, title: typeof note.title === 'string' ? note.title : '', body: note.body,
        kind: note.kind === 'sticky' ? 'sticky' : 'document', pinned: !!note.pinned,
        color: noteColors.includes(note.color) ? note.color : 'yellow',
        stackOrder: Number.isFinite(note.stackOrder) ? note.stackOrder : 0,
        x: Number.isFinite(note.x) ? Math.max(0, Math.min(100, note.x)) : 35,
        y: Number.isFinite(note.y) ? Math.max(0, Math.min(100, note.y)) : 12 };
}

function initializeNotes() {
    try {
        const stored = localStorage.getItem(notesStorageKey);
        if (stored) {
            const data = JSON.parse(stored);
            if (!Array.isArray(data.items)) throw new Error('Invalid notes');
            notesData = { items: data.items.map(normalizeNote), activeId: data.activeId,
                deleted: data.deleted ? normalizeNote(data.deleted) : null,
                widget: { enabled: data.widget?.enabled !== false,
                    x: Number.isFinite(data.widget?.x) ? Math.max(0, Math.min(100, data.widget.x)) : 78,
                    y: Number.isFinite(data.widget?.y) ? Math.max(0, Math.min(100, data.widget.y)) : 5 } };
        }
    } catch {
        notesStorageReady = false;
        noteElement('notes-status').textContent = 'Saved notes could not be read. Existing storage has been left intact; new edits cannot be saved. Export any work you create.';
    }
    if (!activeNote()) notesData.activeId = notesData.items[0]?.id ?? null;
    noteElement('note-new-document').addEventListener('click', () => createNote('document'));
    noteElement('note-new-sticky').addEventListener('click', () => createNote('sticky'));
    noteElement('notes-search').addEventListener('input', renderNoteList);
    noteElement('notes-filter').addEventListener('change', renderNoteList);
    noteElement('note-title').addEventListener('input', updateNoteFromEditor);
    noteElement('note-body').addEventListener('input', updateNoteFromEditor);
    noteElement('note-kind').addEventListener('change', () => {
        const note = activeNote();
        if (!note) return;
        note.kind = noteElement('note-kind').value;
        note.pinned = note.kind === 'sticky';
        saveNotes(); renderNotes();
    });
    noteElement('note-color').addEventListener('change', () => {
        if (!activeNote()) return;
        activeNote().color = noteElement('note-color').value;
        saveNotes(); renderStickyNotes();
    });
    noteElement('note-pin').addEventListener('change', () => {
        if (!activeNote()) return;
        activeNote().pinned = noteElement('note-pin').checked;
        saveNotes(); renderNoteList(); renderStickyNotes();
    });
    document.querySelectorAll('[data-markdown]').forEach(button => {
        button.addEventListener('click', () => insertNoteMarkdown(button.dataset.markdown));
    });
    noteElement('note-body').addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && ['b', 'i'].includes(event.key.toLowerCase())) {
            event.preventDefault();
            insertNoteMarkdown(event.key.toLowerCase() === 'b' ? 'bold' : 'italic');
        }
    });
    noteElement('note-preview-toggle').addEventListener('click', () => {
        notesPreview = !notesPreview; renderNoteEditor();
    });
    noteElement('note-delete').addEventListener('click', () => {
        const note = activeNote();
        if (!note) return;
        notesData.deleted = note;
        notesData.items = notesData.items.filter(item => item.id !== note.id);
        notesData.activeId = notesData.items[0]?.id ?? null;
        saveNotes(); renderNotes();
        noteElement('note-undo').focus();
    });
    noteElement('note-undo').addEventListener('click', () => {
        if (!notesData.deleted) return;
        notesData.items.push(notesData.deleted);
        notesData.activeId = notesData.deleted.id;
        notesData.deleted = null;
        saveNotes(); renderNotes(); noteElement('note-title').focus();
    });
    noteElement('note-export').addEventListener('click', exportNote);
    initializeNotesWidget();
    renderNotes();
}

function createNote(kind) {
    noteElement('notes-search').value = '';
    noteElement('notes-filter').value = 'all';
    const note = { id: crypto.randomUUID(), title: kind === 'sticky' ? new Date().toLocaleString() : '', body: '', kind, pinned: kind === 'sticky',
        color: 'yellow', stackOrder: Math.max(0, ...notesData.items.map(item => item.stackOrder || 0)) + 1,
        x: 30 + (notesData.items.length % 5) * 4, y: 10 + (notesData.items.length % 5) * 4 };
    notesData.items.push(note);
    notesData.activeId = note.id;
    notesPreview = false;
    saveNotes(); renderNotes(); noteElement('note-title').focus();
}

function positionNotesWidget() {
    const widget = noteElement('notes-widget');
    const preference = notesData.widget;
    widget.hidden = !preference.enabled;
    widget.style.left = `clamp(0px, ${preference.x}%, max(0px, calc(100% - 160px)))`;
    widget.style.top = `clamp(0px, ${preference.y}%, max(0px, calc(100% - 44px)))`;
    noteElement('notes-widget-enabled').checked = preference.enabled;
}

function initializeNotesWidget() {
    const widget = noteElement('notes-widget');
    let drag = null, suppressClickUntil = 0;
    positionNotesWidget();
    noteElement('notes-widget-enabled').addEventListener('change', event => {
        notesData.widget.enabled = event.target.checked;
        positionNotesWidget(); saveNotes();
    });
    widget.addEventListener('click', () => {
        if (Date.now() < suppressClickUntil) return;
        openApp('notes', true);
        createNote('sticky');
        noteElement('note-body').focus();
    });
    widget.addEventListener('pointerdown', event => {
        if (event.button !== 0 || !event.isPrimary) return;
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
            left: widget.offsetLeft, top: widget.offsetTop, moved: false };
        widget.setPointerCapture(event.pointerId);
    });
    widget.addEventListener('pointermove', event => {
        if (!drag || drag.id !== event.pointerId) return;
        const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 6) return;
        drag.moved = true;
        widget.classList.add('is-dragging');
        widget.style.left = Math.max(0, Math.min(widget.parentElement.clientWidth - widget.offsetWidth, drag.left + dx)) + 'px';
        widget.style.top = Math.max(0, Math.min(widget.parentElement.clientHeight - widget.offsetHeight, drag.top + dy)) + 'px';
    });
    const finish = event => {
        if (!drag || drag.id !== event.pointerId) return;
        if (drag.moved) {
            suppressClickUntil = Date.now() + 500;
            notesData.widget.x = Number((widget.offsetLeft / Math.max(1, widget.parentElement.clientWidth) * 100).toFixed(6));
            notesData.widget.y = Number((widget.offsetTop / Math.max(1, widget.parentElement.clientHeight) * 100).toFixed(6));
            saveNotes();
        }
        drag = null;
        widget.classList.remove('is-dragging');
        if (widget.hasPointerCapture(event.pointerId)) widget.releasePointerCapture(event.pointerId);
        positionNotesWidget();
    };
    widget.addEventListener('pointerup', finish);
    widget.addEventListener('pointercancel', finish);
    widget.addEventListener('lostpointercapture', finish);
}

function renderNotes() {
    renderNoteList(); renderNoteEditor(); renderStickyNotes();
    noteElement('note-undo').hidden = !notesData.deleted;
}

function renderNoteList() {
    const list = noteElement('notes-list');
    list.replaceChildren();
    const matches = filterNotes(notesData.items, noteElement('notes-search').value, noteElement('notes-filter').value);
    noteElement('notes-results').textContent = matches.length === 0
        ? (notesData.items.length ? 'No matching notes. Try another search or filter.' : 'No notes yet.')
        : `${matches.length} of ${notesData.items.length} notes`;
    matches.forEach(note => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'note-list-item';
        button.setAttribute('aria-current', String(note.id === notesData.activeId));
        const title = document.createElement('strong');
        title.textContent = note.title.trim() || 'Untitled note';
        const type = document.createElement('small');
        type.textContent = note.kind === 'sticky' ? (note.pinned ? 'Sticky · pinned' : 'Sticky') : 'Document';
        button.append(title, type);
        button.addEventListener('click', () => {
            notesData.activeId = note.id; saveNotes(); renderNoteList(); renderNoteEditor();
        });
        list.append(button);
    });
}

function filterNotes(items, query, kind) {
    const search = query.trim().toLocaleLowerCase();
    return items.filter(note => (kind === 'all' || note.kind === kind)
        && `${note.title || 'Untitled note'}\n${note.body}`.toLocaleLowerCase().includes(search));
}

function renderNoteEditor() {
    const note = activeNote();
    noteElement('notes-empty').hidden = !!note;
    noteElement('note-editor').hidden = !note;
    if (!note) return;
    noteElement('note-title').value = note.title;
    noteElement('note-body').value = note.body;
    noteElement('note-kind').value = note.kind;
    noteElement('note-color').value = note.color;
    noteElement('note-pin').checked = note.pinned;
    noteElement('note-pin-label').hidden = note.kind !== 'sticky';
    noteElement('note-color-label').hidden = note.kind !== 'sticky';
    noteElement('note-body').hidden = notesPreview;
    noteElement('note-preview').hidden = !notesPreview;
    noteElement('note-preview').innerHTML = renderNoteMarkdown(note.body);
    noteElement('note-preview-toggle').textContent = notesPreview ? 'Edit Markdown' : 'Preview';
    noteElement('note-preview-toggle').setAttribute('aria-pressed', String(notesPreview));
}

function updateNoteFromEditor() {
    const note = activeNote();
    if (!note) return;
    note.title = noteElement('note-title').value;
    note.body = noteElement('note-body').value;
    saveNotes(); renderNoteList(); renderStickyNotes();
}

function insertNoteMarkdown(format) {
    if (!activeNote()) return;
    if (notesPreview) { notesPreview = false; renderNoteEditor(); }
    const editor = noteElement('note-body');
    const start = editor.selectionStart, end = editor.selectionEnd;
    const selection = editor.value.slice(start, end) || 'text';
    const wrappers = { bold: ['**', '**'], italic: ['*', '*'], code: ['`', '`'], link: ['[', '](https://example.com)'] };
    let replacement;
    if (format === 'heading' || format === 'list') {
        const prefix = format === 'heading' ? '# ' : '- ';
        replacement = (start > 0 && editor.value[start - 1] !== '\n' ? '\n' : '') + selection.split('\n').map(line => prefix + line).join('\n');
    } else replacement = wrappers[format][0] + selection + wrappers[format][1];
    editor.setRangeText(replacement, start, end, 'select');
    editor.focus(); updateNoteFromEditor();
}

function exportNote() {
    const note = activeNote();
    if (!note) return;
    const url = URL.createObjectURL(new Blob([note.body], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = (note.title.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') || 'Untitled note') + '.md';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function bringStickyNoteToFront(noteId) {
    const note = notesData.items.find(item => item.id === noteId);
    if (!note || note.kind !== 'sticky') return;
    const ordered = notesData.items.filter(item => item.kind === 'sticky' && item.id !== noteId)
        .sort((a, b) => (a.stackOrder || 0) - (b.stackOrder || 0));
    ordered.push(note);
    // Keep ranks bounded, preserving list order and pointer capture during drags.
    ordered.forEach((item, index) => { item.stackOrder = index + 1; });
    const board = noteElement('sticky-board');
    [...board.children].forEach(card => {
        card.style.zIndex = String(notesData.items.find(item => item.id === card.dataset.noteId)?.stackOrder || 0);
    });
    saveNotes();
}

function renderStickyNotes() {
    const board = noteElement('sticky-board');
    board.replaceChildren();
    notesData.items.filter(note => note.kind === 'sticky' && note.pinned).forEach(note => {
        const card = document.createElement('article');
        card.className = 'sticky-note'; card.dataset.color = note.color;
        card.dataset.noteId = note.id;
        card.style.zIndex = String(note.stackOrder || 0);
        card.addEventListener('pointerdown', () => bringStickyNoteToFront(note.id));
        card.addEventListener('focusin', () => bringStickyNoteToFront(note.id));
        card.style.left = `clamp(0px, ${note.x}%, max(0px, calc(100% - 240px)))`;
        card.style.top = `clamp(0px, ${note.y}%, max(0px, calc(100% - 200px)))`;
        const header = document.createElement('div'); header.className = 'sticky-header';
        const title = document.createElement('strong'); title.textContent = note.title.trim() || 'Untitled note';
        const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Edit';
        edit.setAttribute('aria-label', 'Edit ' + title.textContent);
        edit.addEventListener('click', () => { notesData.activeId = note.id; notesPreview = false; openApp('notes', true); saveNotes(); renderNotes(); noteElement('note-body').focus(); });
        header.append(title, edit);
        const content = document.createElement('div'); content.className = 'sticky-content markdown-content';
        content.innerHTML = renderNoteMarkdown(note.body) || '<p>Use Edit to start writing.</p>';
        card.append(header, content); board.append(card);
        let drag = null;
        header.addEventListener('pointerdown', event => {
            if (event.button !== 0 || !event.isPrimary || event.target.closest('button')) return;
            drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: card.offsetLeft, top: card.offsetTop };
            header.setPointerCapture(event.pointerId);
        });
        header.addEventListener('pointermove', event => {
            if (!drag || drag.id !== event.pointerId) return;
            card.style.left = Math.max(0, Math.min(board.clientWidth - card.offsetWidth, drag.left + event.clientX - drag.x)) + 'px';
            card.style.top = Math.max(0, Math.min(board.clientHeight - card.offsetHeight, drag.top + event.clientY - drag.y)) + 'px';
        });
        const finish = event => {
            if (!drag || drag.id !== event.pointerId) return;
            note.x = Number((card.offsetLeft / Math.max(1, board.clientWidth) * 100).toFixed(6));
            note.y = Number((card.offsetTop / Math.max(1, board.clientHeight) * 100).toFixed(6));
            drag = null; saveNotes(); renderStickyNotes();
        };
        header.addEventListener('pointerup', finish);
        header.addEventListener('pointercancel', finish);
        header.addEventListener('lostpointercapture', finish);
    });
}
