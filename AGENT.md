# מדריך לסוכן (HERMES) — מערכת המשימות

מסמך זה נכתב כדי שסוכן AI יוכל לנהל את המשימות **דרך API**, בלי לגעת בממשק הגרפי.
הדבקת חלק ה"System prompt" למטה לסוכן — זה כל מה שהוא צריך.

---

## למה לא דרך הממשק?

הממשק הגרפי בנוי לבני אדם. סוכן שמנסה "ללחוץ על שמירה" נתקל בשדות דינמיים,
גלילה, ואירועים — זה שביר ואיטי. במקום זאת יש **API ישיר ב-HTTP**: בקשה אחת = פעולה אחת,
מהיר ואמין. הכל מתועד ומתגלה מעצמו בכתובת:

```
https://chepti.com/tasks/api/api.php?action=help
```

---

## System prompt מוכן להדבקה לסוכן

```
יש לך גישה למערכת משימות אישית של המשתמשת דרך API ב-HTTP.
כתובת הבסיס: https://chepti.com/tasks/api/api.php
אימות: הוסף לכל בקשה את הכותרת  X-Key: <הסיסמה שקיבלת>
אל תפעיל את הממשק הגרפי — עבוד רק מול ה-API.

לפני עבודה, קרא פעם אחת את החוזה המלא:
  GET ...?action=help
כדי לראות את כל הפעולות, השדות והערכים האפשריים.

זרימת עבודה טיפוסית:
1. GET ?action=state — לקבל את המצב הנוכחי (פרויקטים, משימות פתוחות, מזהים ותגים).
2. לפעולות כתיבה שלח POST עם גוף JSON. אפשר לפנות למשימה לפי "match" (חלק מהכותרת)
   במקום "id". אפשר לתת "project" בשם (יימצא או ייווצר).
3. לכמה שינויים יחד — POST ?action=ops עם מערך "ops" (בקשה אחת).

תגיות משימה (כולן אופציונליות — מלא רק מה שברור):
- context: home / out / computer / phone / errand   (איפה זה קורה)
- energy:  low / medium / high                       (כמה אנרגיה דרוש)
- size:    small / medium / big                       (כמה זמן/גודל)
- status:  inbox / next / waiting / someday / done
- is_next: 1 אם זו המשימה הבאה בפרויקט
- due_date: YYYY-MM-DD

כשמדביקים לך ערימת משימות — תייג אותן לפי שיקול דעתך ושלח ב-bulk_add או ב-ops.
```

---

## דוגמאות curl

```bash
KEY="הסיסמה"
BASE="https://chepti.com/tasks/api/api.php"

# 1. תמונת מצב (התחל מכאן):
curl -s "$BASE?action=state" -H "X-Key: $KEY"

# 2. הוספת משימה מתויגת (project לפי שם — ייווצר אם לא קיים):
curl -s -X POST "$BASE?action=task_create" -H "X-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"להזמין עוגה","project":"יום הולדת","context":"out","energy":"low","size":"small","status":"next"}'

# 3. סימון בוצע לפי כותרת (בלי לדעת id):
curl -s -X POST "$BASE?action=task_complete" -H "X-Key: $KEY" \
  -H "Content-Type: application/json" -d '{"match":"עוגה"}'

# 4. עדכון תגית:
curl -s -X POST "$BASE?action=task_update" -H "X-Key: $KEY" \
  -H "Content-Type: application/json" -d '{"match":"דוח שנתי","energy":"high","size":"big"}'

# 5. הדבקת ערימה מתויגת:
curl -s -X POST "$BASE?action=bulk_add" -H "X-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"tasks":[
        {"title":"לקנות חלב","context":"errand","size":"small"},
        {"title":"לכתוב מצגת","project":"קורס","context":"computer","energy":"high","size":"big"},
        "להתקשר לאמא"
      ]}'

# 6. הרבה פעולות בבקשה אחת:
curl -s -X POST "$BASE?action=ops" -H "X-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"ops":[
        {"action":"task_create","title":"משימה חדשה","context":"home"},
        {"action":"task_complete","match":"חלב"},
        {"action":"task_update","match":"מצגת","is_next":1}
      ]}'
```

## פנייה לפי כותרת (match)

- `{"match":"חלב"}` מוצא משימה שהכותרת שלה מכילה "חלב".
- אם יש כמה התאמות — תקבל HTTP 409 עם רשימת `candidates` (id + title). דייק את הטקסט או השתמש ב-`id`.
- זה חוסך את הצורך למשוך רשימה שלמה ולנתח מזהים.

## תשובת ops

מוחזר `{"results":[{"i":0,"action":"...","ok":true,"result":{...}}, {"i":1,"ok":false,"error":"..."}]}` —
כל פעולה מדווחת בנפרד, וכשל באחת לא מפיל את השאר.
