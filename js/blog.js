(() => {
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    function readBlogLink(url = window.location.href) {
        const hash = new URL(url).hash;
        const match = /^#blog(?:\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/([a-z0-9]+(?:-[a-z0-9]+)*))?)?$/.exec(hash);
        return match ? { post: match[1], part: match[2] } : null;
    }

    function createElement(tag, text, className) {
        const element = document.createElement(tag);
        if (text !== undefined) element.textContent = text;
        if (className) element.className = className;
        return element;
    }

    function createLink(post, part, text) {
        const link = createElement('a', text, 'blog-permalink');
        link.href = `#blog/${post}${part ? `/${part}` : ''}`;
        return link;
    }

    function createLinkIcon() {
        const icon = createElement('i', undefined, 'fa-solid fa-link');
        icon.setAttribute('aria-hidden', 'true');
        return icon;
    }

    async function copyBlogLink(href, status) {
        const url = new URL(href, window.location.href).href;
        try {
            await navigator.clipboard.writeText(url);
            status.textContent = 'Link copied!';
            return true;
        } catch {
            status.textContent = `Could not copy automatically. Link: ${url}`;
            return false;
        }
    }

    function createCopyLink(post, part) {
        const wrapper = createElement('span', undefined, 'blog-copy-link');
        const button = createElement('button', undefined, 'blog-copy-button');
        const label = part ? 'Copy link to paragraph' : 'Copy link to post';
        button.type = 'button';
        button.title = label;
        button.setAttribute('aria-label', `${label} in ${post.title}`);
        button.append(createLinkIcon());
        const status = createElement('span', undefined, 'blog-copy-status');
        status.setAttribute('role', 'status');
        let resetTimer;
        button.addEventListener('click', async () => {
            clearTimeout(resetTimer);
            button.disabled = true;
            status.textContent = '';
            const copied = await copyBlogLink(createLink(post.id, part).href, status);
            button.disabled = false;
            if (copied) resetTimer = setTimeout(() => { status.textContent = ''; }, 2500);
        });
        wrapper.append(button, status);
        return wrapper;
    }

    function validatePost(post) {
        if (!post || typeof post.id !== 'string' || !slugPattern.test(post.id)
            || !['title', 'category', 'author', 'markdown'].every(key => typeof post[key] === 'string' && post[key].trim())
            || typeof post.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(post.date)
            || !Number.isFinite(Date.parse(post.date))
            || new Date(post.date).toISOString().slice(0, 10) !== post.date) {
            throw new Error('Invalid blog post');
        }
        return post;
    }

    function renderBlogMarkdown(markdown) {
        // Join soft line breaks in prose before using the shared, HTML-free renderer.
        const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
        const normalized = [];
        let paragraph = [];
        let fenced = false;
        const flush = () => {
            if (paragraph.length) normalized.push(paragraph.join(' '));
            paragraph = [];
        };
        for (const line of lines) {
            if (/^\s*```/.test(line)) {
                flush();
                fenced = !fenced;
                normalized.push(line);
            } else if (fenced || !line.trim() || /^(?:#{1,6}\s|>\s?|\s*(?:[-*+] |\d+\. |---+\s*$))/.test(line)) {
                flush();
                normalized.push(line);
            } else {
                paragraph.push(line.trim());
            }
        }
        flush();
        // Post headings start at h3, below the page and post titles.
        return renderNoteMarkdown(normalized.join('\n')).replace(/<(\/?)h([1-6])>/g,
            (_, closing, level) => `<${closing}h${Math.min(Number(level) + 2, 6)}>`);
    }

    function validatePosts(posts) {
        if (!Array.isArray(posts)) throw new Error('Invalid blog posts');
        posts.forEach(validatePost);
        if (new Set(posts.map(post => post.id)).size !== posts.length) {
            throw new Error('Duplicate blog post IDs');
        }
        return posts;
    }

    function renderPost(post) {
        const article = createElement('article', undefined, 'blog-post');
        article.id = `blog/${post.id}`;
        article.tabIndex = -1;
        const header = createElement('header');
        const heading = createElement('h2');
        const titleLink = createLink(post.id, null, post.title);
        titleLink.classList.add('blog-title-link');
        titleLink.title = 'Link to post';
        heading.append(titleLink, ' ', createCopyLink(post, null));
        heading.id = `${post.id}-title`;
        article.setAttribute('aria-labelledby', heading.id);
        const byline = createElement('p', `By ${post.author} · `, 'blog-byline');
        const date = createElement('time', new Intl.DateTimeFormat('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
        }).format(new Date(post.date)));
        date.dateTime = post.date;
        byline.append(date);
        header.append(createElement('p', post.category, 'blog-eyebrow'), heading, byline);
        article.append(header);
        const body = createElement('div', undefined, 'blog-body');
        body.innerHTML = renderBlogMarkdown(post.markdown);
        article.append(body);
        body.querySelectorAll('p').forEach((paragraph, index) => {
            const partId = `paragraph-${index + 1}`;
            paragraph.id = `blog/${post.id}/${partId}`;
            paragraph.tabIndex = -1;
            paragraph.append(' ', createCopyLink(post, partId));
        });
        return article;
    }

    async function fetchJson(path) {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Could not load ${path}`);
        return response.json();
    }

    function renderOutline(posts, outline) {
        outline.replaceChildren(...Array.from(posts.children, article => {
            const group = createElement('details');
            const summary = createElement('summary');
            const title = article.querySelector('.blog-title-link');
            const link = createElement('a', title.textContent);
            link.href = title.getAttribute('href');
            summary.append(link);
            const list = createElement('ol');
            article.querySelectorAll('.blog-body p').forEach((paragraph, index) => {
                const item = createElement('li');
                const text = paragraph.cloneNode(true);
                text.querySelectorAll('.blog-copy-link').forEach(copy => copy.remove());
                const preview = text.textContent.trim().replace(/\s+/g, ' ');
                const paragraphLink = createElement('a', `${index + 1}. ${preview.length > 70 ? `${preview.slice(0, 70)}…` : preview}`);
                paragraphLink.href = `#${paragraph.id}`;
                paragraphLink.title = preview;
                item.append(paragraphLink);
                list.append(item);
            });
            group.append(summary, list);
            return group;
        }));
        outline.closest('.blog-outline').hidden = !posts.children.length;
    }

    function updateOutline(outline, route) {
        outline.querySelectorAll('a').forEach(link => {
            const current = route && link.getAttribute('href') === `#blog/${route.post}${route.part ? `/${route.part}` : ''}`;
            if (current) {
                link.setAttribute('aria-current', 'location');
                link.closest('details').open = true;
            } else link.removeAttribute('aria-current');
        });
    }

    function openLinkedBlog() {
        openApp('blog', true);
        if (!getAppSettings('blog')?.maximized) {
            snapWindowToZone(document.getElementById('blog'), 'full');
        }
    }

    async function initializeBlog() {
        const status = document.getElementById('blog-status');
        const posts = document.getElementById('blog-posts');
        const outline = document.getElementById('blog-outline-posts');
        const outlineToggle = document.getElementById('blog-outline-toggle');
        const outlineBody = document.getElementById('blog-outline-body');
        outlineToggle.addEventListener('click', () => {
            const collapsed = outlineToggle.getAttribute('aria-expanded') === 'true';
            outlineToggle.setAttribute('aria-expanded', String(!collapsed));
            const label = collapsed ? 'Show contents' : 'Hide contents';
            outlineToggle.setAttribute('aria-label', label);
            outlineToggle.title = label;
            const icon = outlineToggle.querySelector('i');
            icon.classList.toggle('fa-bars', collapsed);
            icon.classList.toggle('fa-xmark', !collapsed);
            outlineBody.inert = collapsed;
            outline.closest('.blog-outline').classList.toggle('blog-outline-collapsed', collapsed);
        });
        let loaded = false;

        function followBlogLink() {
            const route = readBlogLink();
            updateOutline(outline, route);
            if (!route) return;
            openLinkedBlog();
            if (!loaded) return;
            const id = route.post
                ? `blog/${route.post}${route.part ? `/${route.part}` : ''}` : 'blog-posts';
            const target = document.getElementById(id);
            if (!target || !posts.contains(target) && target !== posts) {
                status.textContent = 'The linked blog post or paragraph could not be found.';
                status.hidden = false;
                return;
            }
            status.hidden = true;
            const scroller = posts.closest('.scrollwrapper');
            scroller.scrollTop += target.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
            if (route.post) target.focus({ preventScroll: true });
        }

        window.addEventListener('hashchange', followBlogLink);
        followBlogLink();
        try {
            const data = validatePosts(await fetchJson('blog/posts.json'));
            posts.replaceChildren(...data.map(renderPost));
            renderOutline(posts, outline);
            loaded = true;
            status.textContent = data.length ? '' : 'No posts yet.';
            status.hidden = data.length > 0;
            followBlogLink();
        } catch (error) {
            status.textContent = 'Blog posts could not be loaded. Please reload to try again.';
            status.hidden = false;
            console.error('Could not load blog posts:', error);
        }
    }

    window.addEventListener('load', initializeBlog);
})();
