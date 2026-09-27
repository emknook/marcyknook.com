# YouTube playlist backend setup

1. Upload the `api` directory with the website to your PHP host (PHP 7.4+ and cURL required).
2. In `api/youtube-config.php`, replace `YOUR_YOUTUBE_API_KEY_HERE` with your YouTube Data API key. The file already exists locally. If deploying via Git, copy `youtube-config.example.php` to `youtube-config.php` on the host: the real config is deliberately ignored by Git.
3. Enable YouTube Data API v3 for the key. Restrict it to that API and, if your hosting has a stable outbound IP, that server IP. Browser/referrer restrictions are not appropriate for this server-side key.
4. Open the hosted website, then Music Quiz → Manage playlists → Import a YouTube Music playlist. Paste a public playlist link and choose a name. Review and import.

Prefer setting the `YOUTUBE_API_KEY` hosting environment variable: it overrides the placeholder and avoids storing the secret in the public directory. The PHP config returns data only to the endpoint; a direct request gets an empty 404. PHP must actually execute on the host; never serve a real-key config from a static-only server. Do not upload backup copies of the real config.

The endpoint `api/youtube-playlist.php?playlistId=...` accepts only a playlist ID, contacts only Google's fixed API address, and returns IDs, titles and channel names. The key and upstream error bodies are never returned to the browser. The site has no visitor API-key input.

Operational defaults:
- Up to 20 pages / 1,000 entries; larger lists fail without a partial import.
- 40-second upstream time budget; individual requests time out after at most 10 seconds.
- Successful playlists cached for 15 minutes in the host's system temporary directory.
- 100 upstream page requests per clock hour for this installation (including failures). This global limit protects quota but is not authentication: a public visitor could exhaust it. Change the limit in `youtube-playlist.php` if needed.
- 256 cache slots bound disk use; collisions just cause a cache miss.
- PHP needs writable system temporary storage. A host clearing it also resets the local cache and rate counter.

Until configured, the endpoint returns a friendly 503 message. Other errors explain invalid IDs, inaccessible playlists, quota/access problems and missing cURL. Test the real import after adding the key; no live Google request can be verified with the placeholder. Importing metadata does not remove video embedding restrictions, and release years remain manual.

## MusicBrainz song detail suggestions

Upload `api/musicbrainz.php`, `js/music-details.js`, and the updated HTML, styles and playlist importer. No MusicBrainz API key or account is needed for public metadata lookups. The endpoint identifies this site using `MarcyKnookMusicQuiz/1.0 (https://marcyknook.com/)` as its User-Agent; update that website if reusing the code elsewhere.

After loading a YouTube playlist, click **Find song details** beside a track. Review possible matches and their MusicBrainz source pages, then choose **Use these details**. Changes remain editable and can be undone before importing. A search never automatically replaces fields; edits made during a pending search block applying stale suggestions.

The suggested year uses the recording's `first-release-date`. It is not the upload year, composition year, or earliest cover by a different artist. Covers, live recordings and remixes require manual version checks. Missing dates stay unknown; existing values are not cleared. MusicBrainz search rank is not a confidence probability, so all results are presented as possible matches.

This separate endpoint requires PHP cURL and writable temporary storage. It uses a shared lock and at least 1.1 seconds between upstream requests, a 300-request hourly ceiling, and a 24-hour cache bounded to 256 slots. Busy lookups return a retry message. Multiple independent sites sharing an outbound IP may need a shared limiter. Lookup failures do not prevent manual import.

Reference: https://musicbrainz.org/doc/MusicBrainz_API
