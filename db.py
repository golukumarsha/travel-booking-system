"""
Database layer for the Traveldeal B2B app.

Uses PostgreSQL via psycopg2. Connection details come from the
DATABASE_URL environment variable (see .env.example).
"""

import os
import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://myapp_user:jWFWzKIVq5xV9U1Qv01JKch84S8yWuq0@dpg-d8n8ume7r5hc73ahlang-a/travellIDEA"
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def get_connection():
    """Yields a psycopg2 connection with dict-like row access."""
    con = psycopg2.connect(
        DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        yield con
        con.commit()
    finally:
        con.close()


def init_db():
    """Creates all tables if they don't already exist. Safe to call on every startup."""
    with get_connection() as con:
        cur = con.cursor()

        cur.execute("""
            CREATE TABLE IF NOT EXISTS agents (
                id            SERIAL PRIMARY KEY,
                agency_name   TEXT NOT NULL,
                email         TEXT NOT NULL UNIQUE,
                mobile        TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at    TEXT NOT NULL
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS bookings (
                id             SERIAL PRIMARY KEY,
                order_id       TEXT NOT NULL UNIQUE,
                agent_email    TEXT,
                traveller_name TEXT NOT NULL,
                service        TEXT NOT NULL,
                route          TEXT NOT NULL,
                amount_paise   INTEGER NOT NULL,
                currency       TEXT NOT NULL DEFAULT 'INR',
                status         TEXT NOT NULL DEFAULT 'created',
                payment_id     TEXT,
                created_at     TEXT NOT NULL,
                updated_at     TEXT NOT NULL
            )
        """)

        # Airline-style traveller details captured on the passenger-details
        # step, before the agent is allowed to reach payment. Added with
        # ADD COLUMN IF NOT EXISTS so existing databases upgrade in place.
        cur.execute(
            "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS passenger_details TEXT")
        cur.execute(
            "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS travel_date TEXT")
        cur.execute(
            "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS travel_class TEXT")
        cur.execute(
            "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contact_email TEXT")
        cur.execute(
            "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contact_mobile TEXT")
        cur.execute(
            "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gstin TEXT")
        cur.execute(
            "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS special_requests TEXT")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS newsletter_subscribers (
                id         SERIAL PRIMARY KEY,
                email      TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL
            )
        """)


# ---------------------------------------------------------------------------
# Agents
# ---------------------------------------------------------------------------

def create_agent(agency_name: str, email: str, mobile: str, password_hash: str):
    with get_connection() as con:
        cur = con.cursor()
        cur.execute(
            """INSERT INTO agents (agency_name, email, mobile, password_hash, created_at)
               VALUES (%s, %s, %s, %s, %s)""",
            (agency_name, email.lower().strip(), mobile, password_hash, _now()),
        )


def get_agent_by_email(email: str):
    with get_connection() as con:
        cur = con.cursor()
        cur.execute("SELECT * FROM agents WHERE email = %s",
                    (email.lower().strip(),))
        row = cur.fetchone()
        return dict(row) if row else None


# ---------------------------------------------------------------------------
# Bookings
# ---------------------------------------------------------------------------

def create_booking(order_id, traveller_name, service, route, amount_paise,
                   currency="INR", agent_email=None, passenger_details=None,
                   travel_date=None, travel_class=None, contact_email=None,
                   contact_mobile=None, gstin=None, special_requests=None):
    with get_connection() as con:
        cur = con.cursor()
        cur.execute(
            """INSERT INTO bookings
               (order_id, agent_email, traveller_name, service, route,
                amount_paise, currency, status, created_at, updated_at,
                passenger_details, travel_date, travel_class, contact_email,
                contact_mobile, gstin, special_requests)
               VALUES (%s, %s, %s, %s, %s, %s, %s, 'created', %s, %s,
                       %s, %s, %s, %s, %s, %s, %s)""",
            (order_id, agent_email, traveller_name, service, route,
             amount_paise, currency, _now(), _now(),
             passenger_details, travel_date, travel_class, contact_email,
             contact_mobile, gstin, special_requests),
        )


def mark_booking_paid(order_id: str, payment_id: str):
    with get_connection() as con:
        cur = con.cursor()
        cur.execute(
            """UPDATE bookings
               SET status = 'paid', payment_id = %s, updated_at = %s
               WHERE order_id = %s""",
            (payment_id, _now(), order_id),
        )


def mark_booking_failed(order_id: str):
    with get_connection() as con:
        cur = con.cursor()
        cur.execute(
            "UPDATE bookings SET status = 'failed', updated_at = %s WHERE order_id = %s",
            (_now(), order_id),
        )


def list_bookings(limit: int = 100):
    with get_connection() as con:
        cur = con.cursor()
        cur.execute(
            "SELECT * FROM bookings ORDER BY id DESC LIMIT %s", (limit,))
        return [dict(r) for r in cur.fetchall()]


# ---------------------------------------------------------------------------
# Newsletter
# ---------------------------------------------------------------------------

def add_newsletter_subscriber(email: str):
    with get_connection() as con:
        cur = con.cursor()
        cur.execute(
            """INSERT INTO newsletter_subscribers (email, created_at)
               VALUES (%s, %s)
               ON CONFLICT (email) DO NOTHING""",
            (email.lower().strip(), _now()),
        )
