# המשימות שלי — מערכת GTD אישית

אפליקציית ווב + PWA לניהול משימות בהשראת GTD, בעברית, מותאמת למובייל ולמחשב.

- **כתובת:** https://chepti.com/tasks/
- **טכנולוגיה:** HTML/CSS/JS ואניל בצד לקוח, PHP + SQLite בצד שרת (Hostinger).
- **כניסה:** סיסמה פשוטה. לשינוי — עורכים את `api/config.php` בשרת.

## תצוגות

| תצוגה | מה יש בה |
|---|---|
| עכשיו | סינון לפי מיקום / אנרגיה / גודל — "מה מתאים לי עכשיו?" + כפתור "לא מתאים עכשיו" שמתייג את המשימה לפי הסיבה |
| פרויקטים | רשימת פרויקטים עם התקדמות, משימת "הבא בתור" (כוכב), הוספה מהירה |
| הכל | מלאי מלא לפי סטטוס + הוספה מהירה + הדבקת ערימת שורות |
| נצחונות | היסטוריית ביצוע מקובצת לפי ימים, ספירת השבוע (שישי–חמישי), כפתור חגיגה |

## API — מדריך לסוכן (הרמס)

**שכבת AI מונגשת:** הסוכן לא מפעיל את הממשק הגרפי — הוא עובד ישירות מול ה-API.
- גילוי עצמי (ללא סיסמה): `https://chepti.com/tasks/api/api.php?action=help` — מחזיר את כל החוזה.
- מדריך מלא + System prompt מוכן: [AGENT.md](AGENT.md) · `https://chepti.com/tasks/AGENT.md`
- קובץ גילוי: `https://chepti.com/tasks/llms.txt`

**נוחות לסוכן:**
- פנייה למשימה לפי `{"match":"חלק מהכותרת"}` במקום `{"id":N}` (אין צורך לדעת מזהים).
- שיוך פרויקט לפי `{"project":"שם"}` — נמצא או נוצר אוטומטית.
- `action=state` — תמונת מצב קומפקטית וחסכונית בטוקנים (התחלה מומלצת).
- `action=ops` — כמה פעולות בבקשה אחת, עם דיווח הצלחה/כשל לכל אחת.

כל הבקשות אל `https://chepti.com/tasks/api/api.php`.
אימות: כותרת `X-Key: <הסיסמה>` או פרמטר `?key=<הסיסמה>`.
כל הגוף (body) בפורמט JSON. תשובות JSON.

### קריאת הכל

```bash
curl -s "https://chepti.com/tasks/api/api.php?action=all&key=PASSWORD"
```

מחזיר `{ projects: [...], tasks: [...] }`.

### שדות של משימה

| שדה | ערכים |
|---|---|
| `title` | טקסט (חובה) |
| `notes` | טקסט חופשי |
| `project_id` | מזהה פרויקט או null |
| `status` | `inbox` / `next` / `waiting` / `someday` / `done` / `dropped` |
| `context` | `home` / `out` / `computer` / `phone` / `errand` / ריק |
| `energy` | `low` / `medium` / `high` / ריק |
| `size` | `small` / `medium` / `big` / ריק |
| `is_next` | 0/1 — המשימה הבאה בפרויקט |
| `due_date` | `YYYY-MM-DD` או ריק |
| `snoozed_until` | `YYYY-MM-DD HH:MM:SS` (UTC) או ריק |

### פעולות עיקריות

```bash
# הוספת ערימת משימות מתויגות (הכי שימושי להדבקות):
curl -s -X POST "https://chepti.com/tasks/api/api.php?action=bulk_add&key=PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"tasks":[
    {"title":"לקנות מתנה לרות", "context":"out", "energy":"low", "size":"small", "status":"next"},
    {"title":"לכתוב סילבוס לקורס", "context":"computer", "energy":"high", "size":"big", "status":"next", "project_id":3}
  ]}'

# יצירת משימה בודדת:
curl -s -X POST "...?action=task_create&key=PASSWORD" -d '{"title":"...", "context":"home"}'

# עדכון (רק השדות שרוצים לשנות):
curl -s -X POST "...?action=task_update&key=PASSWORD" -d '{"id":12, "energy":"low", "status":"next"}'

# סימון ביצוע / פתיחה מחדש / מחיקה:
curl -s -X POST "...?action=task_complete&key=PASSWORD" -d '{"id":12}'
curl -s -X POST "...?action=task_reopen&key=PASSWORD" -d '{"id":12}'
curl -s -X POST "...?action=task_delete&key=PASSWORD" -d '{"id":12}'

# פרויקטים:
curl -s -X POST "...?action=project_create&key=PASSWORD" -d '{"name":"שיפוץ המטבח", "color":"#2FBFA7"}'
curl -s -X POST "...?action=project_update&key=PASSWORD" -d '{"id":2, "status":"someday"}'

# היסטוריה ושחזור:
curl -s "...?action=history&limit=50&key=PASSWORD"
curl -s -X POST "...?action=restore&key=PASSWORD" -d '{"history_id":45}'

# גיבוי מלא:
curl -s "...?action=export&key=PASSWORD" > backup.json
```

### ניהול גרסאות

כל שינוי (יצירה, עדכון, השלמה, מחיקה) נשמר בטבלת `history` עם תמונת מצב מלאה של הפריט **לפני** השינוי.
`action=restore` עם `history_id` מחזיר את הפריט למצב שבתמונה — כולל החייאת פריטים שנמחקו.

## פריסה

```powershell
scp -r -F "T:\.ssh\config" index.html sw.js manifest.webmanifest css js icons api hostinger:/home/u630483490/public_html/tasks/
```

קובץ הנתונים `api/tasks.db` נוצר אוטומטית בשרת בבקשה הראשונה — **לא להעלות אותו מחדש** (זה ידרוס נתונים).
ה-`.htaccess` בתיקיית `api` חוסם גישה ישירה ל-DB ול-config.
