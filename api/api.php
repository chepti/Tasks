<?php
/**
 * Tasks API — GTD-style personal task manager.
 * Auth: every request must carry the password, via header X-Key or ?key=.
 * All responses are JSON. Times are stored as UTC 'YYYY-MM-DD HH:MM:SS' strings.
 *
 * Actions (action= query param):
 *   GET  all              -> { projects: [...], tasks: [...] }
 *   POST task_create      -> body: task fields (title required)
 *   POST task_update      -> body: { id, ...fields }
 *   POST task_complete    -> body: { id }            (status=done + completed_at)
 *   POST task_reopen      -> body: { id }
 *   POST task_delete      -> body: { id }            (snapshot kept in history)
 *   POST bulk_add         -> body: { tasks: [ {...}, ... ] }   (for pasting piles)
 *   POST project_create   -> body: { name, ... }
 *   POST project_update   -> body: { id, ...fields }
 *   POST project_delete   -> body: { id }
 *   GET  history          -> ?limit=100  recent change log with snapshots
 *   POST restore          -> body: { history_id }    (restore entity to snapshot)
 *   GET  export           -> full JSON dump (backup)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Key');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

require __DIR__ . '/config.php';

$key = $_SERVER['HTTP_X_KEY'] ?? $_GET['key'] ?? '';
if (!hash_equals($PASSWORD, (string)$key)) {
    http_response_code(401);
    echo json_encode(['error' => 'unauthorized']);
    exit;
}

$db = new PDO('sqlite:' . $DB_PATH);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->exec('PRAGMA journal_mode = WAL');
$db->exec('PRAGMA foreign_keys = ON');

$db->exec("CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    status TEXT DEFAULT 'active',        -- active | someday | done | archived
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
)");

$db->exec("CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    notes TEXT DEFAULT '',
    project_id INTEGER,
    status TEXT DEFAULT 'inbox',         -- inbox | next | waiting | someday | done | dropped
    context TEXT DEFAULT '',             -- home | out | computer | phone | errand | anywhere
    energy TEXT DEFAULT '',              -- low | medium | high
    size TEXT DEFAULT '',                -- small | medium | big
    is_next INTEGER DEFAULT 0,           -- next action of its project
    due_date TEXT DEFAULT '',
    snoozed_until TEXT DEFAULT '',
    completed_at TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
)");

$db->exec("CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity TEXT NOT NULL,                -- task | project
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL,                -- create | update | delete | complete | reopen | restore
    snapshot TEXT NOT NULL,              -- full JSON of the row BEFORE the change (or after, for create)
    at TEXT DEFAULT (datetime('now'))
)");

$TASK_FIELDS = ['title','notes','project_id','status','context','energy','size','is_next','due_date','snoozed_until','completed_at','sort_order'];
$PROJECT_FIELDS = ['name','color','notes','status','sort_order'];

function body() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function out($data) { echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
function fail($msg, $code = 400) { http_response_code($code); out(['error' => $msg]); }

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

function insertTask($db, $data, $TASK_FIELDS) {
    $title = trim($data['title'] ?? '');
    if ($title === '') fail('title required');
    $cols = ['title']; $vals = [$title];
    foreach ($TASK_FIELDS as $f) {
        if ($f !== 'title' && array_key_exists($f, $data)) { $cols[] = $f; $vals[] = $data[$f]; }
    }
    $ph = implode(',', array_fill(0, count($cols), '?'));
    $st = $db->prepare("INSERT INTO tasks (" . implode(',', $cols) . ") VALUES ($ph)");
    $st->execute($vals);
    $id = (int)$db->lastInsertId();
    $row = rowOrFail($db, 'tasks', $id);
    logHistory($db, 'task', $id, 'create', $row);
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
    $st = $db->prepare("UPDATE $table SET " . implode(', ', $sets) . " WHERE id = ?");
    $st->execute($vals);
    logHistory($db, $entity, $id, $action, $before);
    return rowOrFail($db, $table, $id);
}

$action = $_GET['action'] ?? '';

switch ($action) {

case 'all': {
    $projects = $db->query("SELECT * FROM projects ORDER BY sort_order, id")->fetchAll(PDO::FETCH_ASSOC);
    $tasks = $db->query("SELECT * FROM tasks ORDER BY sort_order, id")->fetchAll(PDO::FETCH_ASSOC);
    out(['projects' => $projects, 'tasks' => $tasks, 'now' => gmdate('Y-m-d H:i:s')]);
}

case 'task_create': {
    out(['task' => insertTask($db, body(), $TASK_FIELDS)]);
}

case 'task_update': {
    out(['task' => updateEntity($db, 'tasks', 'task', body(), $TASK_FIELDS)]);
}

case 'task_complete': {
    $data = body();
    $data['status'] = 'done';
    $data['completed_at'] = gmdate('Y-m-d H:i:s');
    $data['is_next'] = 0;
    out(['task' => updateEntity($db, 'tasks', 'task', $data, $TASK_FIELDS, 'complete')]);
}

case 'task_reopen': {
    $data = body();
    $data['status'] = 'next';
    $data['completed_at'] = '';
    out(['task' => updateEntity($db, 'tasks', 'task', $data, $TASK_FIELDS, 'reopen')]);
}

case 'task_delete': {
    $id = (int)(body()['id'] ?? 0);
    $before = rowOrFail($db, 'tasks', $id);
    logHistory($db, 'task', $id, 'delete', $before);
    $db->prepare("DELETE FROM tasks WHERE id = ?")->execute([$id]);
    out(['deleted' => $id]);
}

case 'bulk_add': {
    $items = body()['tasks'] ?? [];
    if (!is_array($items) || !$items) fail('tasks array required');
    $created = [];
    foreach ($items as $item) {
        if (is_string($item)) $item = ['title' => $item];
        $created[] = insertTask($db, $item, $TASK_FIELDS);
    }
    out(['created' => $created, 'count' => count($created)]);
}

case 'project_create': {
    $data = body();
    $name = trim($data['name'] ?? '');
    if ($name === '') fail('name required');
    $cols = ['name']; $vals = [$name];
    foreach ($PROJECT_FIELDS as $f) {
        if ($f !== 'name' && array_key_exists($f, $data)) { $cols[] = $f; $vals[] = $data[$f]; }
    }
    $ph = implode(',', array_fill(0, count($cols), '?'));
    $st = $db->prepare("INSERT INTO projects (" . implode(',', $cols) . ") VALUES ($ph)");
    $st->execute($vals);
    $row = rowOrFail($db, 'projects', (int)$db->lastInsertId());
    logHistory($db, 'project', $row['id'], 'create', $row);
    out(['project' => $row]);
}

case 'project_update': {
    out(['project' => updateEntity($db, 'projects', 'project', body(), $PROJECT_FIELDS)]);
}

case 'project_delete': {
    $id = (int)(body()['id'] ?? 0);
    $before = rowOrFail($db, 'projects', $id);
    logHistory($db, 'project', $id, 'delete', $before);
    // Tasks of a deleted project become project-less rather than vanishing.
    $db->prepare("UPDATE projects SET status='archived' WHERE id = ?")->execute([$id]);
    out(['archived' => $id]);
}

case 'history': {
    $limit = min(500, max(1, (int)($_GET['limit'] ?? 100)));
    $st = $db->prepare("SELECT * FROM history ORDER BY id DESC LIMIT ?");
    $st->execute([$limit]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) { $r['snapshot'] = json_decode($r['snapshot'], true); }
    out(['history' => $rows]);
}

case 'restore': {
    $hid = (int)(body()['history_id'] ?? 0);
    $h = rowOrFail($db, 'history', $hid);
    $snap = json_decode($h['snapshot'], true);
    if (!$snap || empty($snap['id'])) fail('bad snapshot');
    $table = $h['entity'] === 'project' ? 'projects' : 'tasks';
    $allowed = $h['entity'] === 'project' ? $PROJECT_FIELDS : $TASK_FIELDS;

    $st = $db->prepare("SELECT * FROM $table WHERE id = ?");
    $st->execute([$snap['id']]);
    $existing = $st->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        $snap['id'] = $existing['id'];
        $restored = updateEntity($db, $table, $h['entity'], $snap, $allowed, 'restore');
    } else {
        // Row was deleted — recreate it with its original id.
        $cols = ['id']; $vals = [$snap['id']];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $snap)) { $cols[] = $f; $vals[] = $snap[$f]; }
        }
        $ph = implode(',', array_fill(0, count($cols), '?'));
        $db->prepare("INSERT INTO $table (" . implode(',', $cols) . ") VALUES ($ph)")->execute($vals);
        $restored = rowOrFail($db, $table, $snap['id']);
        logHistory($db, $h['entity'], $snap['id'], 'restore', $restored);
    }
    out(['restored' => $restored]);
}

case 'export': {
    out([
        'exported_at' => gmdate('Y-m-d H:i:s'),
        'projects' => $db->query("SELECT * FROM projects")->fetchAll(PDO::FETCH_ASSOC),
        'tasks' => $db->query("SELECT * FROM tasks")->fetchAll(PDO::FETCH_ASSOC),
        'history' => array_map(
            function ($r) { $r['snapshot'] = json_decode($r['snapshot'], true); return $r; },
            $db->query("SELECT * FROM history")->fetchAll(PDO::FETCH_ASSOC)
        ),
    ]);
}

default:
    fail('unknown action: ' . $action, 404);
}
