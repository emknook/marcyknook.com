<?php
// PHP 7.4+ with cURL. No Google response or request URL is exposed on errors.
declare(strict_types=1);
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
define('MUSIC_QUIZ_BACKEND', true);
function respond(int $status, array $data): void {
    http_response_code($status);
    echo json_encode($data, JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
set_exception_handler(function ($error) { respond(500, ['error' => 'The playlist service encountered a server error.']); });
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    header('Allow: GET'); respond(405, ['error' => 'Use GET to load a playlist.']);
}
$id = $_GET['playlistId'] ?? '';
if (!is_string($id) || !preg_match('/^[A-Za-z0-9_-]{10,100}$/D', $id)) {
    respond(400, ['error' => 'Enter a valid YouTube playlist ID.']);
}
$config = require (is_file(__DIR__ . '/youtube-config.php') ? __DIR__ . '/youtube-config.php' : __DIR__ . '/youtube-config.example.php');
$key = $config['api_key'] ?? '';
if (!is_string($key) || $key === '' || $key === 'YOUR_YOUTUBE_API_KEY_HERE') {
    respond(503, ['error' => 'Playlist imports are not configured yet. The site owner needs to set the YouTube API key on the server.']);
}
if (!function_exists('curl_init')) respond(503, ['error' => 'The playlist service requires the PHP cURL extension.']);
// Private temporary storage, isolated per installation. A fixed set of cache slots bounds disk usage.
$directory = sys_get_temp_dir() . '/mk-youtube-' . substr(hash('sha256', __DIR__), 0, 16);
if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
    respond(503, ['error' => 'The playlist service needs writable temporary storage.']);
}
$slot = hexdec(substr(hash('sha256', $id), 0, 2));
$cachePath = $directory . '/cache-' . $slot . '.json';
$cached = json_decode((string) @file_get_contents($cachePath), true);
if (is_array($cached) && ($cached['id'] ?? '') === $id && ($cached['expires'] ?? 0) > time() && isset($cached['items'])) {
    respond(200, ['items' => $cached['items']]);
}
// Global hourly budget: every upstream page costs one allowance, including failed calls.
function consumeBudget(string $directory): void {
    $file = @fopen($directory . '/budget.json', 'c+');
    if (!$file || !flock($file, LOCK_EX)) respond(503, ['error' => 'The playlist service is temporarily unavailable.']);
    $budget = json_decode(stream_get_contents($file), true);
    $hour = (int) floor(time() / 3600);
    if (!is_array($budget) || ($budget['hour'] ?? -1) !== $hour) $budget = ['hour' => $hour, 'count' => 0];
    if ($budget['count'] >= 100) {
        flock($file, LOCK_UN); fclose($file);
        header('Retry-After: ' . (3600 - time() % 3600));
        respond(429, ['error' => 'Playlist imports have reached the hourly limit. Please try again later.']);
    }
    $budget['count']++;
    rewind($file); ftruncate($file, 0);
    $written = fwrite($file, json_encode($budget)); fflush($file); flock($file, LOCK_UN); fclose($file);
    if ($written === false) respond(503, ['error' => 'The playlist service could not update its request limit.']);
}
$items = []; $next = ''; $seen = []; $deadline = microtime(true) + 40;
for ($page = 0; $page < 20; $page++) {
    $remaining = (int) floor($deadline - microtime(true));
    if ($remaining < 1) respond(504, ['error' => 'Loading took too long. Try a smaller playlist. Nothing was imported.']);
    consumeBudget($directory);
    $parameters = ['part' => 'snippet,contentDetails', 'playlistId' => $id, 'maxResults' => 50, 'key' => $key,
        'fields' => 'nextPageToken,items(contentDetails/videoId,snippet(title,videoOwnerChannelTitle))'];
    if ($next !== '') $parameters['pageToken'] = $next;
    $curl = curl_init('https://www.googleapis.com/youtube/v3/playlistItems?' . http_build_query($parameters));
    curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => min(5, $remaining), CURLOPT_TIMEOUT => min(10, $remaining),
        CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2]);
    $raw = curl_exec($curl); $status = curl_getinfo($curl, CURLINFO_HTTP_CODE); curl_close($curl);
    if ($raw === false) respond(502, ['error' => 'The server could not contact YouTube. Please try again.']);
    if ($status === 404) respond(404, ['error' => 'Playlist not found or not publicly accessible.']);
    if ($status === 403) respond(403, ['error' => 'YouTube denied access. The site owner should check the API key, quota and playlist visibility.']);
    if ($status !== 200) respond(502, ['error' => 'YouTube could not load this playlist. Check the link or try again later.']);
    $data = json_decode($raw, true);
    if (!is_array($data) || !isset($data['items']) || !is_array($data['items'])) respond(502, ['error' => 'YouTube returned an unexpected response.']);
    foreach ($data['items'] as $item) {
        // Return only the fields needed for the review screen.
        $items[] = ['contentDetails' => ['videoId' => $item['contentDetails']['videoId'] ?? ''],
            'snippet' => ['title' => $item['snippet']['title'] ?? '', 'videoOwnerChannelTitle' => $item['snippet']['videoOwnerChannelTitle'] ?? '']];
    }
    $next = $data['nextPageToken'] ?? '';
    if ($next === '') break;
    if (!is_string($next) || isset($seen[$next])) respond(502, ['error' => 'YouTube pagination failed. Nothing was imported.']);
    $seen[$next] = true;
}
if ($next !== '') respond(422, ['error' => 'This playlist exceeds 1,000 entries. Split it into smaller playlists. Nothing was imported.']);
@file_put_contents($cachePath, json_encode(['id' => $id, 'expires' => time() + 900, 'items' => $items], JSON_INVALID_UTF8_SUBSTITUTE), LOCK_EX);
respond(200, ['items' => $items]);
