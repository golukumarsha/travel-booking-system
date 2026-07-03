# Traveldeal B2B — Flask + Razorpay + SQLite

A B2B travel-agent portal with:
- Agent registration & login (passwords hashed, stored in SQLite)
- Fare selection and secure checkout via **Razorpay**
- Newsletter signup
- All data persisted in a local SQLite database (`traveldeal.db`, created automatically)

## ✅ Setup

### 1) Install dependencies
```bash
pip install -r requirements.txt
```

### 2) Add Razorpay keys
```bash
cp .env.example .env
```
Edit `.env` and add your keys:
```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxx
PORT=5000
```

### 3) Run
```bash
python app.py
```
Open: http://127.0.0.1:5000/

The database file `traveldeal.db` is created automatically the first time you run the app — no manual setup needed.

## 🚀 Deploying to Render

You already have a Render Postgres database created. Use it like this:

### 1) Set the database URL — in Render's dashboard, never in code
Open your Web Service → **Environment** tab → **Add Environment Variable**:

| Key | Value |
|---|---|
| `DATABASE_URL` | your Postgres **Internal Connection String** (from Render → your database → Info tab) |
| `RAZORPAY_KEY_ID` | your Razorpay key id |
| `RAZORPAY_KEY_SECRET` | your Razorpay key secret |
| `FLASK_DEBUG` | `false` |

⚠️ **Never commit the real `DATABASE_URL` (or any password) into GitHub, `.env`, or `render.yaml`.** Your repo is public — anything committed there is visible to anyone. `.gitignore` in this project already excludes `.env` and `*.db` files so this can't happen by accident.

The **Internal Connection String** (no `.render.com` in the hostname, e.g. `postgresql://user:pass@dpg-xxxxx-a/dbname`) only works from services running *inside* Render — use it for the deployed app. For connecting from your own laptop (e.g. to inspect the DB with a client), use the **External Connection String** shown on the same page instead.

### 2) Create the web service
1. **New → Web Service**, connect your GitHub repo.
2. **Root Directory:** `traveldeal-b2b` (the Flask app lives in this subfolder of your repo).
3. **Build Command:** `pip install -r requirements.txt`
4. **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT`
5. Add the environment variables from step 1.
6. Deploy. Render sets `PORT` automatically.
7. Once live, check `https://<your-app>.onrender.com/health` returns `{"status": "ok"}`.

### 3) Push this code to GitHub
```bash
cd traveldeal-b2b
git add .
git commit -m "Add passenger details step, persistent login, Render deploy config"
git push origin main
```
If your repo currently has an old `traveldeal.db` file committed, remove it so the public repo doesn't carry stale data:
```bash
git rm --cached traveldeal.db
git commit -m "Stop tracking local sqlite db"
git push origin main
```

**Notes**
- `Procfile` and `render.yaml` are already included, so Render (and other Procfile-based hosts) detect how to run the app without extra config.
- Tables are created automatically on startup via `db.init_db()` — no manual migration step needed.

## 📌 Database tables

| Table                   | Purpose                                            |
|--------------------------|-----------------------------------------------------|
| `agents`                 | Registered travel agents (name, email, mobile, hashed password) |
| `bookings`                | Every Razorpay order created, with status (`created` → `paid`/`failed`) |
| `newsletter_subscribers`  | Emails collected from the footer newsletter form   |

## 📌 API Endpoints

| Method | Endpoint              | Description                              |
|--------|------------------------|-------------------------------------------|
| POST   | `/api/register-agent`  | Create a new agent account                |
| POST   | `/api/login`            | Agent login                               |
| POST   | `/api/newsletter`       | Subscribe an email to the newsletter      |
| POST   | `/api/create-order`     | Create a Razorpay order + save booking    |
| POST   | `/api/verify-payment`   | Verify payment signature, update booking  |
| GET    | `/api/bookings`         | List recent bookings (for admin/checks)   |
| GET    | `/health`               | Health check                              |

## 🗂 Project structure
```
app.py           Flask app + all routes
db.py            SQLite database layer (tables + helper functions)
templates/       index.html (frontend)
static/          style.css, script.js
requirements.txt Python dependencies
.env.example     Sample environment variables
```