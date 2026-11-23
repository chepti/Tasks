<?php
/**
 * נקודת פריסה: GitHub Actions קורא לכתובת הזו אחרי כל דחיפה ל-main, והשרת מושך בעצמו את הקוד מ-GitHub
 * (Hostinger חוסם SSH מכתובות של GitHub Actions, אבל HTTPS לאתר עצמו עובד).
 *
 * POST  deploy.php   כותרת X-Deploy-Token: <$DEPLOY_TOKEN מתוך api/config.php>   גוף: sha=<40 תווי hex> (אופציונלי, אחרת main)
 *
 * מה זה עושה: מוריד zip של הריפו הציבורי chepti/Tasks מ-codeload.github.com, שומר גיבוי של הקבצים שיוחלפו
 * (מחוץ לתיקיית האתר, ב-~/backups-private), ומעתיק רק קבצים שהשתנו.
 * לעולם לא נוגע ב: api/config.php, קובץ הנתונים (api/tasks.db*), pub/, .git*, .github/.
 * לא מוחק קבצים שהוסרו מהריפו (בכוונה — פריסה לא אמורה למחוק).
 */
header('Content-Type: application/json; charset=utf-8');

function reply($code, $arr) { http_response_code($code); echo json_encode($arr, JSON_UNESCAPED_UNICODE); exit; }

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') reply(405, ['error' => 'POST only']);

require __DIR__ . '/api/config.php';
if (empty($DEPLOY_TOKEN) || strlen($DEPLOY_TOKEN) < 24) reply(503, ['error' => 'deploy not configured']);
$given = $_SERVER['HTTP_X_DEPLOY_TOKEN'] ?? '';
if (!is_string($given) || !hash_equals($DEPLOY_TOKEN, $given)) { usleep(400000); reply(401, ['error' => 'unauthorized']); }

const REPO = 'chepti/Tasks';
$sha = (string)($_POST['sha'] ?? '');
$ref = preg_match('/^[0-9a-f]{40}$/', $sha) ? $sha : 'refs/heads/main';

// נעילה: פריסה אחת בכל רגע
$lock = fopen(sys_get_temp_dir() . '/tasks-deploy.lock', 'c');
if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) reply(409, ['error' => 'deploy already running']);

set_time_limit(120);
$tmpZip = tempnam(sys_get_temp_dir(), 'tasksdeploy');
$err = null; $zip = null;

for ($try = 1; $try <= 4; $try++) {                       // ה-zip של קומיט חדש יכול להתעכב כמה שניות
    $ch = curl_init('https://codeload.github.com/' . REPO . '/zip/' . $ref);
    $fh = fopen($tmpZip, 'wb');
    curl_setopt_array($ch, [CURLOPT_FILE => $fh, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 60,
                            CURLOPT_USERAGENT => 'tasks-deploy', CURLOPT_FAILONERROR => true]);
    $ok = curl_exec($ch); $http = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch); fclose($fh);
    if ($ok && filesize($tmpZip) > 1000) { $zip = new ZipArchive(); if ($zip->open($tmpZip) === true) break; $zip = null; }
    $err = "download failed (HTTP $http)";
    sleep(3);
}
if (!$zip) { @unlink($tmpZip); reply(502, ['error' => $err ?: 'download failed']); }

$root = __DIR__;
$first = $zip->getNameIndex(0);
$prefix = substr($first, 0, strpos($first, '/') + 1);      // "Tasks-<sha>/"
if ($prefix === '' || $prefix === '/') { @unlink($tmpZip); reply(500, ['error' => 'unexpected zip layout']); }

$skip = function ($rel) {
    return $rel === 'api/config.php' || preg_match('#^api/tasks\.db#', $rel) || strpos($rel, 'pub/') === 0
        || preg_match('#(^|/)\.git(/|$)#', $rel) || strpos($rel, '.github/') === 0
        || strpos($rel, '..') !== false || $rel[0] === '/';
};

$changed = []; $same = 0; $skipped = 0; $plan = [];
for ($i = 0; $i < $zip->numFiles; $i++) {
    $name = $zip->getNameIndex($i);
    if (substr($name, -1) === '/' || strpos($name, $prefix) !== 0) continue;
    $rel = substr($name, strlen($prefix));
    if ($rel === '' || $skip($rel)) { $skipped++; continue; }
    $data = $zip->getFromIndex($i);
    if ($data === false) continue;
    $dest = $root . '/' . $rel;
    if (is_file($dest) && md5_file($dest) === md5($data)) { $same++; continue; }
    $plan[] = [$rel, $dest, $data];
}

// גיבוי הקבצים שעומדים להיות מוחלפים (מחוץ לתיקיית האתר)
$backupDir = null;
foreach ([getenv('HOME'), dirname($root, 2), dirname($root, 3), dirname($root, 4)] as $h) {
    if ($h && is_dir($h . '/backups-private')) { $backupDir = $h . '/backups-private'; break; }   // תיקיית הגיבויים הפרטית, מחוץ לאתר
}
$backupFile = null;
if ($plan && $backupDir) {
    $backupFile = $backupDir . '/tasks-predeploy-' . date('Ymd-His') . '.zip';
    $bz = new ZipArchive();
    if ($bz->open($backupFile, ZipArchive::CREATE) === true) {
        foreach ($plan as [$rel, $dest]) if (is_file($dest)) $bz->addFile($dest, $rel);
        $bz->close();
    } else { $backupFile = null; }
    // שומרים 10 אחרונים
    $old = glob($backupDir . '/tasks-predeploy-*.zip'); sort($old);
    foreach (array_slice($old, 0, max(0, count($old) - 10)) as $f) @unlink($f);
}

foreach ($plan as [$rel, $dest, $data]) {
    $dir = dirname($dest);
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) { reply(500, ['error' => "mkdir failed: $rel", 'changed' => $changed]); }
    $tmp = $dest . '.deploytmp';
    if (file_put_contents($tmp, $data) === false || !rename($tmp, $dest)) {
        @unlink($tmp);
        reply(500, ['error' => "write failed: $rel", 'changed' => $changed, 'backup' => $backupFile ? basename($backupFile) : null]);
    }
    $changed[] = $rel;
}
$zip->close(); @unlink($tmpZip);

if ($backupDir) @file_put_contents($backupDir . '/tasks-last-deploy.json', json_encode(['at' => date('c'), 'ref' => $ref, 'changed' => $changed], JSON_UNESCAPED_UNICODE));
reply(200, ['ok' => true, 'ref' => $ref, 'changed' => $changed, 'unchanged' => $same, 'skipped_protected' => $skipped,
            'backup' => $backupFile ? basename($backupFile) : null]);
