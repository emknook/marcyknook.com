# marcyknook.com

Source code for Marcy Knook's personal website.

## App links

Use `#app/<id>` to open and focus a desktop app, including on initial load
and browser Back/Forward. For example, `https://marcyknook.com/#app/music`.
Closed or minimised apps are restored. Unknown IDs and malformed links are ignored.

| App | URL fragment |
| --- | --- |
| Project Gallery | `#app/app2` |
| Snake | `#app/snake` |
| Settings | `#app/settings` |
| Notes | `#app/notes` |
| Music | `#app/music` |
| Blog & Posts | `#app/blog` |

Blog post and paragraph links continue to use the `#blog/...` format below.

About Marcy and Tools & Skills are temporarily hidden using `data-app-disabled`
on their windows and navigation buttons. They cannot open through saved preferences
or direct links. Remove that attribute and `hidden` from those elements to restore
them. The blog opens by default for new visitors and after a desktop reset.

## Blog posts

The **Blog & Posts** desktop app contains the portfolio's development journal.
Posts are stored as an array of JSON objects in `blog/posts.json`, loaded by `js/blog.js` and styled by
`styling/blog.css`. Serve the site over HTTP(S) so the browser can fetch JSON.

To add a post, add an object to `blog/posts.json` with `id`, `title`, `category`,
`author`, `date` (YYYY-MM-DD), and a nonempty `markdown` string. The array controls
display order; place new posts first to show them at the top. Use unique lowercase
hyphenated post IDs and keep them stable so shared links continue to work.

Write the body as Markdown in the JSON string, using `\n\n` between paragraphs.
Supported formatting includes headings, bold, italic, strikethrough, inline code,
fenced code blocks, lists, blockquotes, horizontal rules, and HTTP(S)/mailto links.
Raw HTML is escaped. This uses the site's small Markdown subset, rather than a full
CommonMark parser. Post headings render below the post title in the heading hierarchy.
Validation rejects missing or empty fields, invalid calendar dates, duplicate post
IDs.

Link to the blog with `#blog`, a post with `#blog/learning-with-codex`, or
an individual paragraph with `#blog/learning-with-codex/paragraph-1`.
The blog opens automatically and scrolls to the target, including when using
browser Back/Forward. Post titles navigate to their links. Blue link icons beside
titles and paragraphs copy the full URL and display a confirmation. If clipboard
access fails, the URL is displayed for manual copying.
Paragraph IDs are generated in reading order (`paragraph-1`, `paragraph-2`, etc.);
inserting or reordering paragraphs changes which text those links point to.

## License

Original source code and associated documentation in this repository are
licensed under the [MIT License](LICENSE), copyright (c) 2026 Marcy Knook.
You may use, modify, redistribute, and sell copies, including in commercial
and closed-source projects, provided you retain the copyright and permission
notice. The software is provided without warranty.

Third-party components retain their own licenses; see
[Third-party notices](THIRD_PARTY_NOTICES.md). The MIT license does not grant
rights to third-party music, videos, fonts, icons, or service data, or override
external service terms.

## Backend setup

See [API setup](api/README.md) for the YouTube playlist and MusicBrainz endpoints.
