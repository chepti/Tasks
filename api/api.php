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
const TRAINING_FIELDS = ['client_id','topic','place','date','time_from','time_to',
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

function baseUrl() {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    return $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . ($_SERVER['SCRIPT_NAME'] ?? '/api/api.php');
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
            'topic' => 'subject of the session', 'place' => 'venue name',
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
$db->exec("CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    snapshot TEXT NOT NULL,
    at TEXT DEFAULT (datetime('now'))
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
            return ['training' => rowOrFail($db, 'trainings', $id)];
        }
        $cols = []; $vals = [];
        foreach (TRAINING_FIELDS as $f) {
            if (array_key_exists($f, $data)) { $cols[] = $f; $vals[] = $data[$f]; }
        }
        if (!$cols) fail('no fields');
        $ph = implode(',', array_fill(0, count($cols), '?'));
        $db->prepare("INSERT INTO trainings (" . implode(',', $cols) . ") VALUES ($ph)")->execute($vals);
        $row = rowOrFail($db, 'trainings', (int)$db->lastInsertId());
        logHistory($db, 'training', $row['id'], 'create', $row);
        return ['training' => $row];
    }

    case 'training_delete': {
        $id = (int)($data['id'] ?? 0);
        $before = rowOrFail($db, 'trainings', $id);
        logHistory($db, 'training', $id, 'delete', $before);
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
