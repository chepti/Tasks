<?php
/**
 * Google OAuth redirect target. Google sends the browser here with ?code&state
 * after the owner approves calendar access. We verify state (HMAC-signed by
 * gcal_auth_url, proves the request started from our own Settings screen),
 * exchange the code for tokens, and store the refresh token for future syncs.
 *
 * This file deliberately takes no app password — Google can't send custom
 * headers on a redirect, so trust comes from the signed state instead.
 */

require __DIR__ . '/config.php';

function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

function page($title, $body, $ok = true) {
    $color = $ok ? '#2FBFA7' : '#FF7B6B';
    echo "<!DOCTYPE html><html lang='he' dir='rtl'><head><meta charset='utf-8'>
    <title>$title</title>
    <style>
      body{font-family:system-ui,sans-serif;background:#FFF8F0;color:#3D3A50;
           display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px}
      .card{background:#fff;border-radius:24px;padding:36px 30px;max-width:420px;text-align:center;
            box-shadow:0 12px 40px rgba(61,58,80,.16)}
      h1{font-size:1.3rem;color:$color;margin:0 0 12px}
      p{color:#8B87A0;line-height:1.6}
    </style></head><body><div class='card'><h1>$title</h1><p>$body</p></div></body></html>";
    exit;
}

function gcalSignState($password) {
    $ts = time();
    return $ts . '.' . hash_hmac('sha256', (string)$ts, $password);
}
function gcalVerifyState($state, $password) {
    $parts = explode('.', (string)$state, 2);
    if (count($parts) !== 2) return false;
    [$ts, $sig] = $parts;
    if (!ctype_digit($ts) || abs(time() - (int)$ts) > 600) return false;
    return hash_equals(hash_hmac('sha256', $ts, $password), $sig);
}
function gcalRedirectUri() {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/api/oauth_callback.php')), '/');
    return $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . $dir . '/oauth_callback.php';
}

if (!empty($_GET['error'])) {
    page('החיבור בוטל', 'לא אושרה גישה ביומן גוגל. אפשר לסגור את החלון ולנסות שוב מההגדרות.', false);
}

$code = $_GET['code'] ?? '';
$state = $_GET['state'] ?? '';
if (!$code || !gcalVerifyState($state, $PASSWORD)) {
    page('קישור לא תקין', 'הקישור הזה פג תוקף או לא תקין. חוזרים להגדרות ומנסים שוב.', false);
}

if (empty($GCAL_CLIENT_ID) || empty($GCAL_CLIENT_SECRET)) {
    page('חסרה הגדרה', 'GCAL_CLIENT_ID / GCAL_CLIENT_SECRET לא מוגדרים ב-config.php בשרת.', false);
}

$ch = curl_init('https://oauth2.googleapis.com/token');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'code' => $code,
    'client_id' => $GCAL_CLIENT_ID,
    'client_secret' => $GCAL_CLIENT_SECRET,
    'redirect_uri' => gcalRedirectUri(),
    'grant_type' => 'authorization_code',
]));
$raw = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$resp = json_decode($raw, true);

if ($httpCode >= 300 || empty($resp['access_token'])) {
    page('החיבור נכשל', 'גוגל החזירה שגיאה: ' . h($resp['error_description'] ?? $resp['error'] ?? $raw), false);
}

if (empty($resp['refresh_token'])) {
    // Google only issues a refresh_token on first-ever consent (or with prompt=consent, which
    // gcal_auth_url always sets) — this should not normally happen, but surface it clearly if it does.
    page('חסר refresh token', 'גוגל לא החזירה הפעם refresh token. נסי לנתק גישה קודמת באתר myaccount.google.com/permissions ולהתחבר שוב מההגדרות.', false);
}

$db = new PDO('sqlite:' . $DB_PATH);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->exec("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT DEFAULT '')");
function setSetting($db, $key, $value) {
    $db->prepare("INSERT INTO settings (key, value) VALUES (?, ?)
                  ON CONFLICT(key) DO UPDATE SET value = excluded.value")->execute([$key, (string)$value]);
}
setSetting($db, 'gcal_refresh_token', $resp['refresh_token']);
setSetting($db, 'gcal_access_token', $resp['access_token']);
setSetting($db, 'gcal_token_expires', time() + (int)($resp['expires_in'] ?? 3000));

page('מחוברת בהצלחה!', 'אפשר לסגור את החלון ולחזור לאפליקציה — עכשיו בהגדרות אפשר לבחור את היומן שאליו יסתנכרנו ההדרכות.');
