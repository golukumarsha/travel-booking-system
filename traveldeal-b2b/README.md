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