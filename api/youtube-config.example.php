<?php
// Copy this file to youtube-config.php and replace the placeholder on your host.
// Alternatively set YOUTUBE_API_KEY in the hosting environment.
if (!defined('MUSIC_QUIZ_BACKEND')) { http_response_code(404); exit; }
return [
    'api_key' => getenv('YOUTUBE_API_KEY') ?: 'YOUR_YOUTUBE_API_KEY_HERE',
];
