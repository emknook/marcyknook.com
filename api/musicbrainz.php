<?php
declare(strict_types=1);
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function mbReply(int $code, array $body): void { http_response_code($code); echo json_encode($body, JSON_INVALID_UTF8_SUBSTITUTE); exit; }
set_exception_handler(function ($e) { mbReply(500, ['error' => 'Song lookup is temporarily unavailable.']); });
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') { header('Allow: GET'); mbReply(405, ['error' => 'Use GET.']); }
$title = $_GET['title'] ?? ''; $artist = $_GET['artist'] ?? '';
if (!is_string($title) || !is_string($artist) || trim($title) === '' || strlen($title) > 800 || strlen($artist) > 640) mbReply(400, ['error' => 'Enter a song title and, if known, an artist.']);
$title = trim($title); $artist = trim($artist);
if (!function_exists('curl_init')) mbReply(503, ['error' => 'Song lookup requires PHP cURL.']);
$dir = sys_get_temp_dir() . '/mk-musicbrainz-' . substr(hash('sha256', __DIR__), 0, 16);
if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) mbReply(503, ['error' => 'Song lookup needs writable temporary storage.']);
$hash = hash('sha256', json_encode(['v2', $title, $artist])); $path = $dir . '/cache-' . substr($hash, 0, 2) . '.json';
$cache = json_decode((string) @file_get_contents($path), true);
if (is_array($cache) && ($cache['hash'] ?? '') === $hash && ($cache['expires'] ?? 0) > time()) mbReply(200, ['matches' => $cache['matches']]);
// One lock covers all visitors, with at least 1.1 seconds between upstream requests.
$lock = @fopen($dir . '/rate.json', 'c+');
if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) { header('Retry-After: 2'); mbReply(429, ['error' => 'Another lookup is running. Try again in a moment.']); }
$state = json_decode(stream_get_contents($lock), true) ?: [];
$hour = (int) floor(time() / 3600); $count = ($state['hour'] ?? -1) === $hour ? ($state['count'] ?? 0) : 0;
if ($count >= 300) mbReply(429, ['error' => 'Song lookups reached the hourly limit. Please try later.']);
$delay = 1.1 - (microtime(true) - ($state['last'] ?? 0));
if ($delay > 0) usleep((int) ($delay * 1000000));
rewind($lock); ftruncate($lock, 0);
if (fwrite($lock, json_encode(['hour' => $hour, 'count' => $count + 1, 'last' => microtime(true)])) === false) mbReply(503, ['error' => 'Could not update lookup limits.']);
fflush($lock);
$quote = function (string $value): string { return '"' . str_replace(['\\', '"'], ['\\\\', '\\"'], $value) . '"'; };
$query = 'recording:' . $quote($title);
if ($artist !== '') $query .= ' AND artist:' . $quote($artist);
$curl = curl_init('https://musicbrainz.org/ws/2/recording?' . http_build_query(['query' => $query, 'fmt' => 'json', 'limit' => 5]));
curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => false, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 15,
    CURLOPT_USERAGENT => 'MarcyKnookMusicQuiz/1.0 (https://marcyknook.com/)', CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2]);
$raw = curl_exec($curl); $code = curl_getinfo($curl, CURLINFO_HTTP_CODE); $errno = curl_errno($curl); curl_close($curl);
flock($lock, LOCK_UN); fclose($lock);
if ($raw === false) {
    $message = $errno === 60 ? 'The hosting server could not verify MusicBrainz’s HTTPS certificate. Ask your host to update PHP’s CA certificate bundle.'
        : ($errno === 28 ? 'MusicBrainz timed out. Please retry.' : 'The hosting server could not connect to MusicBrainz (connection error ' . $errno . ').');
    mbReply(502, ['error' => $message]);
}
if ($code === 429 || $code === 503) { header('Retry-After: 3'); mbReply(503, ['error' => 'MusicBrainz is busy or limiting requests. Wait a few seconds and retry.', 'retryable' => true]); }
if ($code === 403) mbReply(502, ['error' => 'MusicBrainz refused access from the hosting server (HTTP 403). The host’s IP may be restricted.']);
if ($code === 400) mbReply(502, ['error' => 'MusicBrainz rejected this search (HTTP 400). Try a simpler title.']);
if ($code !== 200) mbReply(502, ['error' => 'MusicBrainz returned HTTP ' . $code . '. Please retry later.']);
$data = json_decode($raw, true);
if (!is_array($data) || !isset($data['recordings']) || !is_array($data['recordings'])) mbReply(502, ['error' => 'Unexpected MusicBrainz response.']);
$matches = [];
foreach ($data['recordings'] as $recording) {
    $id = $recording['id'] ?? '';
    if (!is_string($id) || !preg_match('/^[a-f0-9-]{36}$/D', $id)) continue;
    $credit = '';
    foreach (($recording['artist-credit'] ?? []) as $part) $credit .= ($part['name'] ?? $part['artist']['name'] ?? '') . ($part['joinphrase'] ?? '');
    $date = $recording['first-release-date'] ?? '';
    $year = is_string($date) && preg_match('/^([1-9][0-9]{3})(?:-|$)/', $date, $m) ? $m[1] : '';
    $matches[] = ['id' => $id, 'title' => $recording['title'] ?? '', 'artist' => $credit, 'year' => $year,
        'note' => $recording['disambiguation'] ?? '', 'score' => (int) ($recording['score'] ?? 0)];
}
@file_put_contents($path, json_encode(['hash' => $hash, 'expires' => time() + 86400, 'matches' => $matches], JSON_INVALID_UTF8_SUBSTITUTE), LOCK_EX);
mbReply(200, ['matches' => $matches]);
