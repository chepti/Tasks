<?php
/**
 * Tasks API — GTD-style personal task manager.
 *
 * Auth: every request (except ?action=help) must carry the password,
 *       via header  X-Key: <password>   or query  ?key=<password>.
 * Bodies and responses are JSON. Times are UTC 'YYYY-MM-DD HH:MM:SS' strings.
 *
 * Point an AI agent at  ?action=help  — it returns the full machine-readable
 * contract (fields, enums, examples). Agents should call this HTTP API
 * directly; they never need to drive the web UI.
 *
 * Agent-friendly shortcuts:
 *   - Target a task by title with  {"match":"..."} instead of {"id":N}.
 *   - Set a project by name with   {"project":"..."}  (resolved or created).
 *   - Run many actions in one call with  action=ops  { "ops":[ {...}, ... ] }.
 *   - Get a compact, token-cheap snapshot with  action=state.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Key');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

require __DIR__ . '/config.php';

/* ---------- errors as exceptions so batch ops can survive one failure ---------- */
class ApiError extends Exception {
    public $status; public $extra;
    function __construct($msg, $status = 400, $extra = []) {
        parent::__construct($msg); $this->status = $status; $this->extra = $extra;
    }
}
function fail($msg, $code = 400, $extra = []) { throw new ApiError($msg, $code, $extra); }
function out($data) { echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }

const TASK_FIELDS = ['title','notes','project_id','status','context','energy','size','is_next','due_date','snoozed_until','completed_at','sort_order'];
const PROJECT_FIELDS = ['name','color','notes','status','sort_order'];
const TRAINING_FIELDS = ['client_id','topic','place','mode','date','time_from','time_to',
    'contact_name','contact_phone','contact_email','contact_role',
    'pay_amount','pay_process','pay_received',
    'people_count','audience','style','ideas','tools','equipment','structure','message',
    'slides_url','recording_url','fu_recording','fu_whatsapp','fu_takeaways','notes'];

const ENUMS = [
    'status'  => ['inbox','next','waiting','someday','done','dropped'],
    'context' => ['home','out','computer','phone','errand',''],
    'energy'  => ['low','medium','high',''],
    'size'    => ['small','medium','big',''],
];

const TMODE_LABELS = ['physical' => 'פיזי', 'online' => 'מקוון', 'hybrid' => 'היברידי'];

function baseUrl() {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    return $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . ($_SERVER['SCRIPT_NAME'] ?? '/api/api.php');
}

/** URL of oauth_callback.php, which lives next to api.php. Must exactly match the
 *  "Authorized redirect URI" registered on the Google OAuth client. */
function gcalRedirectUri() {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/api/api.php')), '/');
    return $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . $dir . '/oauth_callback.php';
}

/** Signs a short-lived OAuth "state" value so oauth_callback.php can trust it came from us,
 *  without ever putting our app password in a URL (which Google would see as a Referer). */
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

/* ---------- self-describing contract (no auth needed) ---------- */
function helpDoc() {
    $b = baseUrl();
    return [
        'name' => 'Tasks GTD API',
        'purpose' => 'Personal GTD task manager. Agents should use THIS HTTP API directly — do not automate the web UI.',
        'base_url' => $b,
        'auth' => 'Send header  X-Key: <password>  OR add  ?key=<password>  to the URL. Ask the owner for the password.',
        'how_to_call' => 'Every action is  ' . $b . '?action=<name>[&key=...] . GET for reads, POST with a JSON body for writes.',
        'enums' => ENUMS,
        'task_fields' => [
            'title' => 'string, required',
            'notes' => 'free text',
            'project_id' => 'number or null — or use "project" (name) instead',
            'project' => 'project NAME; resolved to an existing project or a new one is created (write actions only)',
            'status' => 'one of ' . implode(' / ', ENUMS['status']),
            'context' => 'where it happens: ' . implode(' / ', array_filter(ENUMS['context'])),
            'energy' => 'how much energy it needs: low / medium / high',
            'size' => 'how big/long: small / medium / big',
            'is_next' => '0 or 1 — mark as the next action of its project',
            'due_date' => 'YYYY-MM-DD or ""',
            'snoozed_until' => 'YYYY-MM-DD HH:MM:SS (UTC) or "" — hidden from "now" until then',
        ],
        'training_fields' => [
            'topic' => 'subject of the session', 'place' => 'venue name or platform',
            'mode' => 'physical / online / hybrid',
            'date' => 'YYYY-MM-DD', 'time_from' => 'HH:MM', 'time_to' => 'HH:MM',
            'contact_name / contact_phone / contact_email / contact_role' => 'contact person details',
            'pay_amount / pay_process' => 'payment sum and process', 'pay_received' => '0/1',
            'people_count' => 'expected attendance', 'audience' => 'audience traits, prior knowledge, what they already covered',
            'style' => 'workshop / inspiration / lecture...', 'ideas' => 'session ideas', 'tools' => 'tools to teach',
            'equipment' => 'equipment teachers need', 'structure' => 'requested structure', 'message' => 'requested core message',
            'slides_url / recording_url' => 'links', 'fu_recording / fu_whatsapp / fu_takeaways' => '0/1 follow-up checklist',
            'notes' => 'free text', 'client_id' => 'optional client-generated id for idempotent offline sync',
        ],
        'targeting_a_task' => 'For update/complete/reopen/delete pass {"id":N} OR {"match":"substring of the title"}. If "match" is ambiguous you get HTTP 409 with a candidates list — refine or use the id.',
        'actions' => [
            'help'           => 'GET  — this document (no auth).',
            'state'          => 'GET  — compact snapshot: projects + open tasks + upcoming trainings (token-cheap). Best first call.',
            'all'            => 'GET  — full dump { projects, tasks } including completed.',
            'task_create'    => 'POST — create one task. Body = task fields (title required).',
            'task_update'    => 'POST — { id|match, ...fields to change }.',
            'task_complete'  => 'POST — { id|match } → status=done, sets completed_at.',
            'task_reopen'    => 'POST — { id|match } → back to next.',
            'task_delete'    => 'POST — { id|match } (snapshot kept for restore).',
            'bulk_add'       => 'POST — { tasks:[ {..}|"title", ... ] }. Best for pasting a pile.',
            'project_create' => 'POST — { name, color?, notes?, status? }.',
            'project_update' => 'POST — { id, ...fields }.',
            'project_delete' => 'POST — { id } (archives it).',
            'training_upsert'=> 'POST — create/update a training session. Update by {id}, or by {client_id} if it exists, else insert. See training_fields.',
            'training_delete'=> 'POST — { id } (snapshot kept for restore).',
            'ops'            => 'POST — { ops:[ {action, ...}, ... ] } run in order; returns per-op ok/error. One round-trip for many changes.',
            'history'        => 'GET  — ?limit=100 recent changes with before-snapshots.',
            'restore'        => 'POST — { history_id } revert an item to that snapshot.',
            'export'         => 'GET  — full backup JSON.',
            'feed_url'       => 'GET  — the private ICS calendar-subscription URL (for Google Calendar "add from URL").',
            'ics'            => 'GET  — ?token=<feed token> the iCalendar feed itself (text/calendar). Auth via feed token, not the password.',
            'gcal_status'    => 'GET  — owner-only: whether two-way Google Calendar sync is connected.',
            'gcal_sync'      => 'GET/POST — owner-only: pull calendar changes into trainings now. Training writes auto-push to Calendar when connected; agents do not need to call this.',
        ],
        'examples' => [
            'add a tagged task' =>
                'POST ' . $b . '?action=task_create   body: {"title":"לקנות מתנה לרות","project":"ימי הולדת","context":"out","energy":"low","size":"small","status":"next"}',
            'mark done by title' =>
                'POST ' . $b . '?action=task_complete   body: {"match":"מתנה לרות"}',
            'paste a pile' =>
                'POST ' . $b . '?action=bulk_add   body: {"tasks":[{"title":"א","context":"home"},{"title":"ב","project":"בית","energy":"high"}]}',
            'many changes at once' =>
                'POST ' . $b . '?action=ops   body: {"ops":[{"action":"task_create","title":"חדשה"},{"action":"task_complete","match":"ישנה"},{"action":"task_update","match":"דוח","energy":"high"}]}',
        ],
        'tips' => [
            'Call state first to learn ids, project names and current tags.',
            'Prefer match over id when you only know the title.',
            'Prefer ops to batch several edits into a single request.',
            'Only fill the fields you know — every tag is optional.',
        ],
    ];
}

$action = $_GET['action'] ?? '';

if ($action === 'help') { out(helpDoc()); }

/* ---------- ICS calendar feed (read-only, authed by FEED_TOKEN) ---------- */
if ($action === 'ics') {
    $tok = $_GET['token'] ?? '';
    if (!isset($FEED_TOKEN) || $FEED_TOKEN === '' || !hash_equals($FEED_TOKEN, (string)$tok)) {
        http_response_code(401);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'unauthorized feed token';
        exit;
    }
    $db = new PDO('sqlite:' . $DB_PATH);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $rows = [];
    try {
        $rows = $db->query("SELECT * FROM trainings WHERE date != '' ORDER BY date")->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable $e) { $rows = []; }

    $host = $_SERVER['HTTP_HOST'] ?? 'chepti.com';
    $esc = function ($s) {
        $s = str_replace(["\\", "\n", ",", ";"], ["\\\\", "\\n", "\\,", "\\;"], (string)$s);
        return $s;
    };
    // fold long lines to <=75 octets per RFC 5545
    $fold = function ($line) {
        $out = ''; $len = 0;
        foreach (preg_split('//u', $line, -1, PREG_SPLIT_NO_EMPTY) as $ch) {
            $b = strlen($ch);
            if ($len + $b > 73) { $out .= "\r\n "; $len = 1; }
            $out .= $ch; $len += $b;
        }
        return $out;
    };

    $L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//chepti//tasks//HE',
          'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:הדרכות', 'X-WR-TIMEZONE:Asia/Jerusalem'];

    foreach ($rows as $t) {
        $date = str_replace('-', '', $t['date']);          // YYYYMMDD
        $allDay = empty($t['time_from']);
        $L[] = 'BEGIN:VEVENT';
        $L[] = 'UID:training-' . $t['id'] . '@' . $host;
        $L[] = 'DTSTAMP:' . gmdate('Ymd\THis\Z');
        if ($allDay) {
            $end = gmdate('Ymd', strtotime($t['date'] . ' +1 day'));
            $L[] = 'DTSTART;VALUE=DATE:' . $date;
            $L[] = 'DTEND;VALUE=DATE:' . $end;
        } else {
            $from = str_replace(':', '', $t['time_from']) . '00';
            $to = $t['time_to'] ? str_replace(':', '', $t['time_to']) . '00'
                                : sprintf('%02d0000', (int)substr($t['time_from'], 0, 2) + 2);
            $L[] = 'DTSTART;TZID=Asia/Jerusalem:' . $date . 'T' . $from;
            $L[] = 'DTEND;TZID=Asia/Jerusalem:' . $date . 'T' . $to;
        }
        $modeLabel = TMODE_LABELS[$t['mode']] ?? '';
        $summary = trim(($modeLabel ? "[$modeLabel] " : '') . ($t['topic'] ?: 'הדרכה'));
        $L[] = $fold('SUMMARY:' . $esc($summary));
        if ($t['place']) $L[] = $fold('LOCATION:' . $esc($t['place']));

        $desc = [];
        if ($modeLabel) $desc[] = "אופן: $modeLabel";
        if ($t['contact_name'] || $t['contact_phone']) $desc[] = 'איש קשר: ' . trim($t['contact_name'] . ' ' . $t['contact_phone']);
        if ($t['people_count']) $desc[] = 'משתתפים: ' . $t['people_count'];
        if ($t['message']) $desc[] = 'מסר: ' . $t['message'];
        if ($t['slides_url']) $desc[] = 'מצגת: ' . $t['slides_url'];
        if ($t['recording_url']) $desc[] = 'הקלטה: ' . $t['recording_url'];
        if ($t['notes']) $desc[] = $t['notes'];
        if ($desc) $L[] = $fold('DESCRIPTION:' . $esc(implode("\n", $desc)));
        $L[] = 'END:VEVENT';
    }
    $L[] = 'END:VCALENDAR';

    header('Content-Type: text/calendar; charset=utf-8');
    header('Content-Disposition: inline; filename="trainings.ics"');
    echo implode("\r\n", $L) . "\r\n";
    exit;
}

/* ---------- auth gate ---------- */
$key = $_SERVER['HTTP_X_KEY'] ?? $_GET['key'] ?? '';
if (!hash_equals($PASSWORD, (string)$key)) {
    http_response_code(401);
    out(['error' => 'unauthorized', 'hint' => 'send header X-Key or ?key=; see ?action=help']);
}

/* ---------- db ---------- */
$db = new PDO('sqlite:' . $DB_PATH);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->exec('PRAGMA journal_mode = WAL');
$db->exec('PRAGMA foreign_keys = ON');

$db->exec("CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
)");
$db->exec("CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    notes TEXT DEFAULT '',
    project_id INTEGER,
    status TEXT DEFAULT 'inbox',
    context TEXT DEFAULT '',
    energy TEXT DEFAULT '',
    size TEXT DEFAULT '',
    is_next INTEGER DEFAULT 0,
    due_date TEXT DEFAULT '',
    snoozed_until TEXT DEFAULT '',
    completed_at TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
)");
$db->exec("CREATE TABLE IF NOT EXISTS trainings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT DEFAULT '',              -- offline-created id, for idempotent upsert
    topic TEXT DEFAULT '',
    place TEXT DEFAULT '',
    mode TEXT DEFAULT '',                   -- physical | online | hybrid
    date TEXT DEFAULT '',                   -- YYYY-MM-DD
    time_from TEXT DEFAULT '',
    time_to TEXT DEFAULT '',
    contact_name TEXT DEFAULT '',
    contact_phone TEXT DEFAULT '',
    contact_email TEXT DEFAULT '',
    contact_role TEXT DEFAULT '',
    pay_amount TEXT DEFAULT '',
    pay_process TEXT DEFAULT '',
    pay_received INTEGER DEFAULT 0,
    people_count TEXT DEFAULT '',
    audience TEXT DEFAULT '',
    style TEXT DEFAULT '',
    ideas TEXT DEFAULT '',
    tools TEXT DEFAULT '',
    equipment TEXT DEFAULT '',
    structure TEXT DEFAULT '',
    message TEXT DEFAULT '',
    slides_url TEXT DEFAULT '',
    recording_url TEXT DEFAULT '',
    fu_recording INTEGER DEFAULT 0,
    fu_whatsapp INTEGER DEFAULT 0,
    fu_takeaways INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
)");
// migration: add columns to an already-existing trainings table (ignore if present)
foreach ([
    'mode' => "TEXT DEFAULT ''",
    'gcal_event_id' => "TEXT DEFAULT ''",   // linked Google Calendar event, once synced
    'gcal_updated' => "TEXT DEFAULT ''",    // event's Google 'updated' timestamp we last saw (conflict check)
] as $col => $decl) {
    try { $db->exec("ALTER TABLE trainings ADD COLUMN $col $decl"); } catch (Throwable $e) { /* exists */ }
}

$db->exec("CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    snapshot TEXT NOT NULL,
    at TEXT DEFAULT (datetime('now'))
)");

// key/value store for runtime state that isn't training/task data: OAuth tokens, the
// chosen calendar id, last-sync bookkeeping. Deliberately separate from config.php,
// which holds only the static app credentials (client id/secret).
$db->exec("CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT DEFAULT ''
)");

/* ---------- helpers ---------- */
function body() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function rowOrFail($db, $table, $id) {
    $st = $db->prepare("SELECT * FROM $table WHERE id = ?");
    $st->execute([$id]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row) fail("$table #$id not found", 404);
    return $row;
}

function logHistory($db, $entity, $entityId, $action, $snapshot) {
    $st = $db->prepare("INSERT INTO history (entity, entity_id, action, snapshot) VALUES (?,?,?,?)");
    $st->execute([$entity, $entityId, $action, json_encode($snapshot, JSON_UNESCAPED_UNICODE)]);
}

/** Resolve {"project":"name"} → project_id (existing, matched case-insensitively, or newly created). */
function resolveProjectInto($db, &$data) {
    if (!array_key_exists('project', $data)) return;
    $name = trim((string)$data['project']);
    unset($data['project']);
    if ($name === '') return;
    $st = $db->prepare("SELECT id FROM projects WHERE name = ? COLLATE NOCASE LIMIT 1");
    $st->execute([$name]);
    $pid = $st->fetchColumn();
    if (!$pid) {
        $db->prepare("INSERT INTO projects (name) VALUES (?)")->execute([$name]);
        $pid = (int)$db->lastInsertId();
        logHistory($db, 'project', $pid, 'create', rowOrFail($db, 'projects', $pid));
    }
    $data['project_id'] = (int)$pid;
}

/** Resolve a task by {"id"} or {"match": title-substring}. $scope: 'open' | 'done' | 'any'. */
function resolveTaskId($db, $data, $scope = 'open') {
    if (!empty($data['id'])) return (int)$data['id'];
    $m = trim((string)($data['match'] ?? ''));
    if ($m === '') fail('provide "id" or "match"');
    $where = "title LIKE ?";
    if ($scope === 'open') $where .= " AND status NOT IN ('done','dropped')";
    if ($scope === 'done') $where .= " AND status = 'done'";
    $st = $db->prepare("SELECT id, title, status FROM tasks WHERE $where ORDER BY id DESC");
    $st->execute(['%' . $m . '%']);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    if (!$rows) { // fall back to any scope
        $st = $db->prepare("SELECT id, title, status FROM tasks WHERE title LIKE ? ORDER BY id DESC");
        $st->execute(['%' . $m . '%']);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    }
    if (!$rows) fail("no task matches \"$m\"", 404);
    if (count($rows) > 1) fail("\"$m\" matches " . count($rows) . " tasks — refine or use id", 409, ['candidates' => $rows]);
    return (int)$rows[0]['id'];
}

function insertTask($db, $data) {
    resolveProjectInto($db, $data);
    $title = trim($data['title'] ?? '');
    if ($title === '') fail('title required');
    $cols = ['title']; $vals = [$title];
    foreach (TASK_FIELDS as $f) {
        if ($f !== 'title' && array_key_exists($f, $data)) { $cols[] = $f; $vals[] = $data[$f]; }
    }
    $ph = implode(',', array_fill(0, count($cols), '?'));
    $db->prepare("INSERT INTO tasks (" . implode(',', $cols) . ") VALUES ($ph)")->execute($vals);
    $row = rowOrFail($db, 'tasks', (int)$db->lastInsertId());
    logHistory($db, 'task', $row['id'], 'create', $row);
    return $row;
}

function updateEntity($db, $table, $entity, $data, $allowed, $action = 'update') {
    $id = (int)($data['id'] ?? 0);
    $before = rowOrFail($db, $table, $id);
    $sets = []; $vals = [];
    foreach ($allowed as $f) {
        if (array_key_exists($f, $data)) { $sets[] = "$f = ?"; $vals[] = $data[$f]; }
    }
    if (!$sets) fail('no fields to update');
    if ($table === 'tasks') $sets[] = "updated_at = datetime('now')";
    $vals[] = $id;
    $db->prepare("UPDATE $table SET " . implode(', ', $sets) . " WHERE id = ?")->execute($vals);
    logHistory($db, $entity, $id, $action, $before);
    return rowOrFail($db, $table, $id);
}

/* =====================================================================
 * Google Calendar two-way sync.
 *
 * Every field of a training round-trips through the event's description as
 * "[Label] value" blocks (multi-line values run until the next [Label]),
 * plus a trailing hidden "TASKS-ID: n" line that links the event back to our
 * row. Title/location/start/end map to native Calendar fields. An event
 * created directly in Calendar (no TASKS-ID yet) is *adopted*: we create a
 * training for it and write the id back onto the event.
 *
 * All of this is optional and self-disabling: every entry point checks
 * gcalConfigured() first and quietly no-ops if OAuth hasn't been set up yet,
 * so trainings work exactly as before until the owner connects a calendar.
 * ===================================================================== */

function getSetting($db, $key, $default = '') {
    $st = $db->prepare("SELECT value FROM settings WHERE key = ?");
    $st->execute([$key]);
    $v = $st->fetchColumn();
    return $v === false ? $default : $v;
}
function setSetting($db, $key, $value) {
    $db->prepare("INSERT INTO settings (key, value) VALUES (?, ?)
                  ON CONFLICT(key) DO UPDATE SET value = excluded.value")->execute([$key, (string)$value]);
}

function gcalConfigured($db) {
    global $GCAL_CLIENT_ID, $GCAL_CLIENT_SECRET;
    return !empty($GCAL_CLIENT_ID) && !empty($GCAL_CLIENT_SECRET) && getSetting($db, 'gcal_refresh_token') !== '';
}

/** Curl helper for Google's REST APIs. Throws ApiError with Google's message on failure. */
function gcalHttp($method, $url, $token = null, $body = null, $isForm = false) {
    $ch = curl_init($url);
    $headers = [];
    if ($token) $headers[] = 'Authorization: Bearer ' . $token;
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    if ($body !== null) {
        if ($isForm) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($body));
            $headers[] = 'Content-Type: application/x-www-form-urlencoded';
        } else {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
            $headers[] = 'Content-Type: application/json';
        }
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($raw === false) fail("google api network error: $err", 502);
    $json = json_decode($raw, true);
    if ($code >= 300) fail('google api error: ' . ($json['error']['message'] ?? $json['error_description'] ?? $raw), 502);
    return $json;
}

/** Returns a live access token, refreshing via the stored refresh_token if the cached one expired. */
function gcalAccessToken($db) {
    global $GCAL_CLIENT_ID, $GCAL_CLIENT_SECRET;
    if (!gcalConfigured($db)) return null;
    $cached = getSetting($db, 'gcal_access_token');
    $expires = (int)getSetting($db, 'gcal_token_expires', '0');
    if ($cached && time() < $expires - 60) return $cached;

    $refresh = getSetting($db, 'gcal_refresh_token');
    $resp = gcalHttp('POST', 'https://oauth2.googleapis.com/token', null, [
        'client_id' => $GCAL_CLIENT_ID, 'client_secret' => $GCAL_CLIENT_SECRET,
        'refresh_token' => $refresh, 'grant_type' => 'refresh_token',
    ], true);
    setSetting($db, 'gcal_access_token', $resp['access_token']);
    setSetting($db, 'gcal_token_expires', time() + (int)($resp['expires_in'] ?? 3000));
    return $resp['access_token'];
}

const GCAL_SECTIONS = [
    'mode'         => 'מקוון/פיזי',
    'contact'      => 'איש קשר',
    'pay'          => 'תשלום',
    'pay_received' => 'תשלום התקבל',
    'audience_num' => 'כמה אנשים',
    'style'        => 'סגנון',
    'audience'     => 'קהל וידע קודם',
    'ideas'        => 'רעיונות',
    'tools'        => 'כלים',
    'message'      => 'מסר מרכזי',
    'structure'    => 'מבנה מבוקש',
    'equipment'    => 'ציוד למורים',
    'slides_url'   => 'מצגת',
    'recording_url'=> 'הקלטה',
    'followups'    => 'פעולות משלימות',
    'notes'        => 'הערות',
];

/** Builds the Calendar event body from a training row. */
function gcalBuildEvent($t) {
    $modeLabel = TMODE_LABELS[$t['mode']] ?? '';
    $summary = trim(($modeLabel ? "[$modeLabel] " : '') . ($t['topic'] ?: 'הדרכה'));

    $lines = [];
    if ($t['contact_name'] || $t['contact_phone'] || $t['contact_email'] || $t['contact_role']) {
        $lines[] = '[' . GCAL_SECTIONS['contact'] . '] ' . implode(' | ', array_filter([
            $t['contact_name'], $t['contact_role'], $t['contact_phone'], $t['contact_email'],
        ]));
    }
    if ($t['pay_amount'] || $t['pay_process']) {
        $lines[] = '[' . GCAL_SECTIONS['pay'] . '] ' . implode(' | ', array_filter([$t['pay_amount'], $t['pay_process']]));
    }
    $lines[] = '[' . GCAL_SECTIONS['pay_received'] . '] ' . ($t['pay_received'] == 1 ? 'כן' : 'לא');
    if ($t['people_count']) $lines[] = '[' . GCAL_SECTIONS['audience_num'] . '] ' . $t['people_count'];
    if ($t['style']) $lines[] = '[' . GCAL_SECTIONS['style'] . '] ' . $t['style'];
    foreach (['audience','ideas','tools','message','structure','equipment','slides_url','recording_url'] as $f) {
        if (!empty($t[$f])) $lines[] = '[' . GCAL_SECTIONS[$f] . "]\n" . $t[$f];
    }
    $fu = array_filter([
        $t['fu_recording'] == 1 ? 'הקלטה' : null,
        $t['fu_whatsapp'] == 1 ? 'וואטסאפ' : null,
        $t['fu_takeaways'] == 1 ? 'תובנות' : null,
    ]);
    if ($fu) $lines[] = '[' . GCAL_SECTIONS['followups'] . '] ' . implode(', ', $fu);
    if ($t['notes']) $lines[] = '[' . GCAL_SECTIONS['notes'] . "]\n" . $t['notes'];
    $lines[] = '';
    $lines[] = 'TASKS-ID: ' . $t['id'];

    $event = [
        'summary' => $summary,
        'description' => implode("\n", $lines),
    ];
    if ($t['place']) $event['location'] = $t['place'];
    if ($t['date']) {
        if ($t['time_from']) {
            $end = $t['time_to'] ?: sprintf('%02d:%02d', ((int)substr($t['time_from'], 0, 2) + 2) % 24, (int)substr($t['time_from'], 3, 2));
            $event['start'] = ['dateTime' => $t['date'] . 'T' . $t['time_from'] . ':00', 'timeZone' => 'Asia/Jerusalem'];
            $event['end'] = ['dateTime' => $t['date'] . 'T' . $end . ':00', 'timeZone' => 'Asia/Jerusalem'];
        } else {
            $endDate = gmdate('Y-m-d', strtotime($t['date'] . ' +1 day'));
            $event['start'] = ['date' => $t['date']];
            $event['end'] = ['date' => $endDate];
        }
    }
    return $event;
}

/** Parses an incoming Calendar event back into training fields. Returns [fields, tasksId|null]. */
function gcalParseEvent($event) {
    $summary = $event['summary'] ?? '';
    $mode = '';
    if (preg_match('/^\[([^\]]+)\]\s*(.*)$/su', $summary, $m)) {
        $label = trim($m[1]);
        $found = array_search($label, TMODE_LABELS);
        if ($found !== false) { $mode = $found; $summary = $m[2]; }
    }

    $desc = $event['description'] ?? '';
    $tasksId = null;
    if (preg_match('/TASKS-ID:\s*(\d+)/', $desc, $m)) $tasksId = (int)$m[1];
    $desc = preg_replace('/\s*TASKS-ID:\s*\d+\s*$/', '', $desc);

    $labelToField = array_flip(GCAL_SECTIONS);
    $sections = [];
    $cur = null;
    foreach (preg_split('/\r?\n/', $desc) as $line) {
        if (preg_match('/^\[([^\]]+)\]\s*(.*)$/u', $line, $m)) {
            $cur = trim($m[1]);
            $sections[$cur] = trim($m[2]);
        } elseif ($cur !== null) {
            $sections[$cur] = trim($sections[$cur] . "\n" . $line);
        }
    }

    $fields = ['topic' => trim($summary), 'mode' => $mode];
    if (!empty($event['location'])) $fields['place'] = $event['location'];
    $start = $event['start']['dateTime'] ?? $event['start']['date'] ?? null;
    if ($start) {
        $fields['date'] = substr($start, 0, 10);
        $fields['time_from'] = isset($event['start']['dateTime']) ? substr($start, 11, 5) : '';
        $end = $event['end']['dateTime'] ?? null;
        $fields['time_to'] = $end ? substr($end, 11, 5) : '';
    }
    foreach ($sections as $label => $val) {
        $f = $labelToField[$label] ?? null;
        if ($f === 'contact') {
            $parts = array_map('trim', explode('|', $val));
            $fields['contact_name'] = $parts[0] ?? ''; $fields['contact_role'] = $parts[1] ?? '';
            $fields['contact_phone'] = $parts[2] ?? ''; $fields['contact_email'] = $parts[3] ?? '';
        } elseif ($f === 'pay') {
            $parts = array_map('trim', explode('|', $val));
            $fields['pay_amount'] = $parts[0] ?? ''; $fields['pay_process'] = $parts[1] ?? '';
        } elseif ($f === 'pay_received') {
            $fields['pay_received'] = (mb_strpos($val, 'כן') !== false) ? 1 : 0;
        } elseif ($f === 'audience_num') {
            $fields['people_count'] = $val;
        } elseif ($f === 'followups') {
            $fields['fu_recording'] = (mb_strpos($val, 'הקלטה') !== false) ? 1 : 0;
            $fields['fu_whatsapp'] = (mb_strpos($val, 'וואטסאפ') !== false) ? 1 : 0;
            $fields['fu_takeaways'] = (mb_strpos($val, 'תובנות') !== false) ? 1 : 0;
        } elseif ($f) {
            $fields[$f] = $val;
        }
    }
    if (!$sections && trim($desc) !== '') $fields['notes'] = trim($desc);
    return [$fields, $tasksId];
}

/** Push one training to its Calendar event: create if new, update if linked. Silently no-ops if not configured. */
function gcalPushTraining($db, $trainingId) {
    if (!gcalConfigured($db)) return;
    $token = gcalAccessToken($db);
    $calId = getSetting($db, 'gcal_calendar_id');
    if (!$token || !$calId) return;
    $t = rowOrFail($db, 'trainings', $trainingId);
    $event = gcalBuildEvent($t);
    $base = 'https://www.googleapis.com/calendar/v3/calendars/' . rawurlencode($calId) . '/events';
    if (!empty($t['gcal_event_id'])) {
        $resp = gcalHttp('PATCH', $base . '/' . rawurlencode($t['gcal_event_id']), $token, $event);
    } else {
        $resp = gcalHttp('POST', $base, $token, $event);
    }
    $db->prepare("UPDATE trainings SET gcal_event_id = ?, gcal_updated = ? WHERE id = ?")
       ->execute([$resp['id'], $resp['updated'] ?? '', $trainingId]);
}

/** Delete the linked Calendar event for a training, if any. Silently no-ops on any failure. */
function gcalDeleteEvent($db, $eventId) {
    if (!gcalConfigured($db) || !$eventId) return;
    try {
        $token = gcalAccessToken($db);
        $calId = getSetting($db, 'gcal_calendar_id');
        if ($token && $calId) {
            gcalHttp('DELETE', 'https://www.googleapis.com/calendar/v3/calendars/' . rawurlencode($calId) . '/events/' . rawurlencode($eventId), $token);
        }
    } catch (Throwable $e) { /* event already gone or unreachable — not fatal */ }
}

/** Pulls events changed since the last sync, updates/creates/adopts trainings. Returns a small summary. */
function gcalPullChanges($db) {
    if (!gcalConfigured($db)) return ['skipped' => 'not configured'];
    $token = gcalAccessToken($db);
    $calId = getSetting($db, 'gcal_calendar_id');
    if (!$token || !$calId) return ['skipped' => 'no calendar selected'];

    $updatedMin = getSetting($db, 'gcal_last_sync');
    $base = 'https://www.googleapis.com/calendar/v3/calendars/' . rawurlencode($calId) . '/events';
    $params = ['singleEvents' => 'true', 'showDeleted' => 'true', 'maxResults' => 250];
    if ($updatedMin) $params['updatedMin'] = $updatedMin; else $params['timeMin'] = gmdate('Y-m-d\TH:i:s\Z', strtotime('-3 months'));

    $created = 0; $updated = 0; $adopted = 0; $skippedCancelled = 0;
    $pageToken = null;
    $syncStamp = gmdate('Y-m-d\TH:i:s.v\Z');
    do {
        if ($pageToken) $params['pageToken'] = $pageToken;
        $resp = gcalHttp('GET', $base . '?' . http_build_query($params), $token);
        foreach ($resp['items'] ?? [] as $event) {
            if (($event['status'] ?? '') === 'cancelled') { $skippedCancelled++; continue; }
            [$fields, $tasksId] = gcalParseEvent($event);

            $localId = null;
            if ($tasksId) {
                $st = $db->prepare("SELECT id FROM trainings WHERE id = ?"); $st->execute([$tasksId]);
                if ($st->fetchColumn()) $localId = $tasksId;
            }
            if (!$localId) {
                $st = $db->prepare("SELECT id FROM trainings WHERE gcal_event_id = ?"); $st->execute([$event['id']]);
                $localId = $st->fetchColumn() ?: null;
            }

            if ($localId) {
                $row = rowOrFail($db, 'trainings', $localId);
                if (($event['updated'] ?? '') === $row['gcal_updated']) continue; // our own last push, nothing new
                $sets = []; $vals = [];
                foreach (TRAINING_FIELDS as $f) if (array_key_exists($f, $fields)) { $sets[] = "$f=?"; $vals[] = $fields[$f]; }
                $sets[] = "gcal_event_id=?"; $vals[] = $event['id'];
                $sets[] = "gcal_updated=?"; $vals[] = $event['updated'] ?? '';
                $sets[] = "updated_at=datetime('now')";
                $vals[] = $localId;
                $db->prepare("UPDATE trainings SET " . implode(',', $sets) . " WHERE id=?")->execute($vals);
                $updated++;
            } else {
                $cols = ['gcal_event_id', 'gcal_updated']; $vals = [$event['id'], $event['updated'] ?? ''];
                foreach (TRAINING_FIELDS as $f) if (array_key_exists($f, $fields)) { $cols[] = $f; $vals[] = $fields[$f]; }
                $ph = implode(',', array_fill(0, count($cols), '?'));
                $db->prepare("INSERT INTO trainings (" . implode(',', $cols) . ") VALUES ($ph)")->execute($vals);
                $newId = (int)$db->lastInsertId();
                logHistory($db, 'training', $newId, 'create', rowOrFail($db, 'trainings', $newId));
                // adopt: write the new id back onto the event so future edits match by TASKS-ID
                try {
                    $adoptedEvent = gcalHttp('PATCH',
                        'https://www.googleapis.com/calendar/v3/calendars/' . rawurlencode($calId) . '/events/' . rawurlencode($event['id']),
                        $token, ['description' => rtrim($event['description'] ?? '') . "\n\nTASKS-ID: $newId"]);
                    $db->prepare("UPDATE trainings SET gcal_updated=? WHERE id=?")->execute([$adoptedEvent['updated'] ?? '', $newId]);
                } catch (Throwable $e) { /* adoption is best-effort */ }
                $created++; $adopted++;
            }
        }
        $pageToken = $resp['nextPageToken'] ?? null;
    } while ($pageToken);

    setSetting($db, 'gcal_last_sync', $syncStamp);
    return ['created' => $created, 'updated' => $updated, 'adopted' => $adopted, 'cancelled_seen' => $skippedCancelled];
}

function projectMap($db) {
    $map = [];
    foreach ($db->query("SELECT id, name FROM projects")->fetchAll(PDO::FETCH_ASSOC) as $p) {
        $map[$p['id']] = $p['name'];
    }
    return $map;
}

function compactTask($t, $projMap) {
    $o = ['id' => (int)$t['id'], 'title' => $t['title'], 'status' => $t['status']];
    if (!empty($t['project_id']) && isset($projMap[$t['project_id']])) $o['project'] = $projMap[$t['project_id']];
    foreach (['context','energy','size','due_date','notes'] as $f) if (!empty($t[$f])) $o[$f] = $t[$f];
    if ($t['is_next'] == 1) $o['is_next'] = true;
    if (!empty($t['snoozed_until']) && $t['snoozed_until'] > gmdate('Y-m-d H:i:s')) $o['snoozed'] = true;
    return $o;
}

/* ---------- dispatch: returns a payload array (does not emit) ---------- */
function dispatch($db, $action, $data) {
    switch ($action) {

    case 'state': {
        $projMap = projectMap($db);
        $projects = $db->query("SELECT id, name, color, status FROM projects WHERE status != 'archived' ORDER BY sort_order, id")->fetchAll(PDO::FETCH_ASSOC);
        $tasks = $db->query("SELECT * FROM tasks WHERE status NOT IN ('done','dropped') ORDER BY is_next DESC, sort_order, id")->fetchAll(PDO::FETCH_ASSOC);
        $open = array_map(function ($t) use ($projMap) { return compactTask($t, $projMap); }, $tasks);
        $doneToday = $db->query("SELECT COUNT(*) FROM tasks WHERE status='done' AND completed_at >= '" . gmdate('Y-m-d') . " 00:00:00'")->fetchColumn();
        $st = $db->prepare("SELECT id, topic, place, date, time_from, time_to FROM trainings WHERE date >= ? ORDER BY date LIMIT 5");
        $st->execute([gmdate('Y-m-d')]);
        return [
            'projects' => array_map(function ($p) { return ['id' => (int)$p['id'], 'name' => $p['name'], 'status' => $p['status']]; }, $projects),
            'open_tasks' => $open,
            'upcoming_trainings' => $st->fetchAll(PDO::FETCH_ASSOC),
            'counts' => ['open' => count($open), 'done_today' => (int)$doneToday],
            'now' => gmdate('Y-m-d H:i:s'),
        ];
    }

    case 'all': {
        return [
            'projects' => $db->query("SELECT * FROM projects ORDER BY sort_order, id")->fetchAll(PDO::FETCH_ASSOC),
            'tasks' => $db->query("SELECT * FROM tasks ORDER BY sort_order, id")->fetchAll(PDO::FETCH_ASSOC),
            'trainings' => $db->query("SELECT * FROM trainings ORDER BY CASE WHEN date='' THEN 1 ELSE 0 END, date, id")->fetchAll(PDO::FETCH_ASSOC),
            'now' => gmdate('Y-m-d H:i:s'),
        ];
    }

    case 'training_upsert': {
        // Update by id; else by client_id (idempotent for offline retries); else insert.
        $id = 0;
        if (!empty($data['id']) && is_numeric($data['id'])) {
            $id = (int)$data['id'];
        } elseif (!empty($data['client_id'])) {
            $st = $db->prepare("SELECT id FROM trainings WHERE client_id = ? LIMIT 1");
            $st->execute([$data['client_id']]);
            $id = (int)$st->fetchColumn();
        }
        if ($id) {
            $data['id'] = $id;
            $sets = []; $vals = [];
            foreach (TRAINING_FIELDS as $f) {
                if (array_key_exists($f, $data)) { $sets[] = "$f = ?"; $vals[] = $data[$f]; }
            }
            if (!$sets) fail('no fields to update');
            $before = rowOrFail($db, 'trainings', $id);
            $sets[] = "updated_at = datetime('now')";
            $vals[] = $id;
            $db->prepare("UPDATE trainings SET " . implode(', ', $sets) . " WHERE id = ?")->execute($vals);
            logHistory($db, 'training', $id, 'update', $before);
            try { gcalPushTraining($db, $id); } catch (Throwable $e) { /* sync is best-effort, never blocks the save */ }
            return ['training' => rowOrFail($db, 'trainings', $id)];
        }
        $cols = []; $vals = [];
        foreach (TRAINING_FIELDS as $f) {
            if (array_key_exists($f, $data)) { $cols[] = $f; $vals[] = $data[$f]; }
        }
        if (!$cols) fail('no fields');
        $ph = implode(',', array_fill(0, count($cols), '?'));
        $db->prepare("INSERT INTO trainings (" . implode(',', $cols) . ") VALUES ($ph)")->execute($vals);
        $newId = (int)$db->lastInsertId();
        $row = rowOrFail($db, 'trainings', $newId);
        logHistory($db, 'training', $row['id'], 'create', $row);
        try { gcalPushTraining($db, $newId); } catch (Throwable $e) { /* best-effort */ }
        return ['training' => rowOrFail($db, 'trainings', $newId)];
    }

    case 'training_delete': {
        $id = (int)($data['id'] ?? 0);
        $before = rowOrFail($db, 'trainings', $id);
        logHistory($db, 'training', $id, 'delete', $before);
        gcalDeleteEvent($db, $before['gcal_event_id']);
        $db->prepare("DELETE FROM trainings WHERE id = ?")->execute([$id]);
        return ['deleted' => $id];
    }

    case 'task_create':
        return ['task' => insertTask($db, $data)];

    case 'task_update': {
        $data['id'] = resolveTaskId($db, $data, 'any');
        resolveProjectInto($db, $data);
        return ['task' => updateEntity($db, 'tasks', 'task', $data, TASK_FIELDS)];
    }

    case 'task_complete': {
        $id = resolveTaskId($db, $data, 'open');
        $d = ['id' => $id, 'status' => 'done', 'completed_at' => gmdate('Y-m-d H:i:s'), 'is_next' => 0];
        return ['task' => updateEntity($db, 'tasks', 'task', $d, TASK_FIELDS, 'complete')];
    }

    case 'task_reopen': {
        $id = resolveTaskId($db, $data, 'done');
        $d = ['id' => $id, 'status' => 'next', 'completed_at' => ''];
        return ['task' => updateEntity($db, 'tasks', 'task', $d, TASK_FIELDS, 'reopen')];
    }

    case 'task_delete': {
        $id = resolveTaskId($db, $data, 'any');
        $before = rowOrFail($db, 'tasks', $id);
        logHistory($db, 'task', $id, 'delete', $before);
        $db->prepare("DELETE FROM tasks WHERE id = ?")->execute([$id]);
        return ['deleted' => $id];
    }

    case 'bulk_add': {
        $items = $data['tasks'] ?? [];
        if (!is_array($items) || !$items) fail('tasks array required');
        $created = [];
        foreach ($items as $item) {
            if (is_string($item)) $item = ['title' => $item];
            $created[] = insertTask($db, $item);
        }
        return ['created' => $created, 'count' => count($created)];
    }

    case 'project_create': {
        $name = trim($data['name'] ?? '');
        if ($name === '') fail('name required');
        $cols = ['name']; $vals = [$name];
        foreach (PROJECT_FIELDS as $f) {
            if ($f !== 'name' && array_key_exists($f, $data)) { $cols[] = $f; $vals[] = $data[$f]; }
        }
        $ph = implode(',', array_fill(0, count($cols), '?'));
        $db->prepare("INSERT INTO projects (" . implode(',', $cols) . ") VALUES ($ph)")->execute($vals);
        $row = rowOrFail($db, 'projects', (int)$db->lastInsertId());
        logHistory($db, 'project', $row['id'], 'create', $row);
        return ['project' => $row];
    }

    case 'project_update':
        return ['project' => updateEntity($db, 'projects', 'project', $data, PROJECT_FIELDS)];

    case 'project_delete': {
        $id = (int)($data['id'] ?? 0);
        $before = rowOrFail($db, 'projects', $id);
        logHistory($db, 'project', $id, 'delete', $before);
        $db->prepare("UPDATE projects SET status='archived' WHERE id = ?")->execute([$id]);
        return ['archived' => $id];
    }

    case 'history': {
        $limit = min(500, max(1, (int)($_GET['limit'] ?? 100)));
        $st = $db->prepare("SELECT * FROM history ORDER BY id DESC LIMIT ?");
        $st->execute([$limit]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['snapshot'] = json_decode($r['snapshot'], true); }
        return ['history' => $rows];
    }

    case 'restore': {
        $hid = (int)($data['history_id'] ?? 0);
        $h = rowOrFail($db, 'history', $hid);
        $snap = json_decode($h['snapshot'], true);
        if (!$snap || empty($snap['id'])) fail('bad snapshot');
        $tables = ['project' => 'projects', 'training' => 'trainings', 'task' => 'tasks'];
        $fields = ['project' => PROJECT_FIELDS, 'training' => TRAINING_FIELDS, 'task' => TASK_FIELDS];
        $table = $tables[$h['entity']] ?? 'tasks';
        $allowed = $fields[$h['entity']] ?? TASK_FIELDS;
        $st = $db->prepare("SELECT * FROM $table WHERE id = ?");
        $st->execute([$snap['id']]);
        if ($st->fetch(PDO::FETCH_ASSOC)) {
            return ['restored' => updateEntity($db, $table, $h['entity'], $snap, $allowed, 'restore')];
        }
        $cols = ['id']; $vals = [$snap['id']];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $snap)) { $cols[] = $f; $vals[] = $snap[$f]; }
        }
        $ph = implode(',', array_fill(0, count($cols), '?'));
        $db->prepare("INSERT INTO $table (" . implode(',', $cols) . ") VALUES ($ph)")->execute($vals);
        $restored = rowOrFail($db, $table, $snap['id']);
        logHistory($db, $h['entity'], $snap['id'], 'restore', $restored);
        return ['restored' => $restored];
    }

    case 'feed_url': {
        global $FEED_TOKEN;
        if (empty($FEED_TOKEN)) fail('feed token not configured', 500);
        return ['ics_url' => baseUrl() . '?action=ics&token=' . rawurlencode($FEED_TOKEN)];
    }

    case 'gcal_status': {
        global $GCAL_CLIENT_ID, $GCAL_CLIENT_SECRET;
        return [
            'has_credentials' => !empty($GCAL_CLIENT_ID) && !empty($GCAL_CLIENT_SECRET),
            'connected' => gcalConfigured($db),
            'calendar_id' => getSetting($db, 'gcal_calendar_id'),
            'last_sync' => getSetting($db, 'gcal_last_sync'),
        ];
    }

    case 'gcal_auth_url': {
        global $GCAL_CLIENT_ID, $PASSWORD;
        if (empty($GCAL_CLIENT_ID)) fail('Google client id/secret not set in config.php yet', 400);
        $params = [
            'client_id' => $GCAL_CLIENT_ID,
            'redirect_uri' => gcalRedirectUri(),
            'response_type' => 'code',
            'scope' => 'https://www.googleapis.com/auth/calendar',
            'access_type' => 'offline',
            'prompt' => 'consent',
            'state' => gcalSignState($PASSWORD),
        ];
        return ['auth_url' => 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params)];
    }

    case 'gcal_calendars': {
        if (!gcalConfigured($db)) fail('not connected yet', 400);
        $token = gcalAccessToken($db);
        $resp = gcalHttp('GET', 'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer', $token);
        $list = array_map(function ($c) { return ['id' => $c['id'], 'name' => $c['summary']]; }, $resp['items'] ?? []);
        return ['calendars' => $list];
    }

    case 'gcal_create_calendar': {
        if (!gcalConfigured($db)) fail('not connected yet', 400);
        $name = trim($data['name'] ?? 'הדרכות');
        $token = gcalAccessToken($db);
        $resp = gcalHttp('POST', 'https://www.googleapis.com/calendar/v3/calendars', $token, [
            'summary' => $name, 'timeZone' => 'Asia/Jerusalem',
        ]);
        setSetting($db, 'gcal_calendar_id', $resp['id']);
        return ['calendar' => ['id' => $resp['id'], 'name' => $resp['summary']]];
    }

    case 'gcal_set_calendar': {
        $id = trim($data['calendar_id'] ?? '');
        if (!$id) fail('calendar_id required');
        setSetting($db, 'gcal_calendar_id', $id);
        setSetting($db, 'gcal_last_sync', ''); // force a full resync against the newly chosen calendar
        return ['ok' => true];
    }

    case 'gcal_sync':
        return gcalPullChanges($db);

    case 'gcal_disconnect': {
        foreach (['gcal_refresh_token','gcal_access_token','gcal_token_expires','gcal_calendar_id','gcal_last_sync'] as $k) {
            $db->prepare("DELETE FROM settings WHERE key = ?")->execute([$k]);
        }
        return ['ok' => true];
    }

    case 'export': {
        return [
            'exported_at' => gmdate('Y-m-d H:i:s'),
            'projects' => $db->query("SELECT * FROM projects")->fetchAll(PDO::FETCH_ASSOC),
            'tasks' => $db->query("SELECT * FROM tasks")->fetchAll(PDO::FETCH_ASSOC),
            'trainings' => $db->query("SELECT * FROM trainings")->fetchAll(PDO::FETCH_ASSOC),
            'history' => array_map(
                function ($r) { $r['snapshot'] = json_decode($r['snapshot'], true); return $r; },
                $db->query("SELECT * FROM history")->fetchAll(PDO::FETCH_ASSOC)
            ),
        ];
    }

    default:
        fail('unknown action: ' . $action, 404);
    }
}

/* ---------- run ---------- */
try {
    if ($action === 'ops') {
        $ops = body()['ops'] ?? [];
        if (!is_array($ops) || !$ops) fail('ops array required');
        $results = [];
        foreach ($ops as $i => $op) {
            $act = $op['action'] ?? '';
            unset($op['action']);
            try {
                $results[] = ['i' => $i, 'action' => $act, 'ok' => true, 'result' => dispatch($db, $act, $op)];
            } catch (ApiError $e) {
                $results[] = array_merge(['i' => $i, 'action' => $act, 'ok' => false, 'error' => $e->getMessage()], $e->extra);
            }
        }
        out(['results' => $results, 'now' => gmdate('Y-m-d H:i:s')]);
    }

    out(dispatch($db, $action, body()));

} catch (ApiError $e) {
    http_response_code($e->status);
    out(array_merge(['error' => $e->getMessage()], $e->extra));
} catch (Throwable $e) {
    http_response_code(500);
    out(['error' => 'server error', 'detail' => $e->getMessage()]);
}
