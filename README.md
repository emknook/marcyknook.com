# marcyknook.com

Source code for Marcy Knook's personal website.

## Blog posts

The **Blog & Posts** desktop app contains the portfolio's development journal.
Posts live as semantic `<article class="blog-post">` elements inside
`#blog .blog-content` in `index.html`, with presentation in `styling/blog.css`.
To add a post, insert another article before the existing one, give its heading
a unique ID, and reference that ID in the article's `aria-labelledby` attribute.
Keep the post text in HTML so it ships with the site without a separate data fetch.

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
