from flask import Flask, request, jsonify, render_template
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import json
import os
import uuid

import db

try:
    import razorpay
except ImportError:
    razorpay = None

app = Flask(__name__, static_folder="static", template_folder="templates")
load_dotenv()

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")

# Create tables (if they don't already exist) as soon as the app starts.
db.init_db()


@app.route("/")
def index():
    return render_template("index.html", razorpay_key_id=RAZORPAY_KEY_ID)


# ---------------------------------------------------------------------------
# Agent registration & login
# ---------------------------------------------------------------------------

@app.route("/api/register-agent", methods=["POST"])
def register_agent():
    data = request.get_json(silent=True) or {}
    agency_name = (data.get("agency_name") or "").strip()
    email = (data.get("email") or "").strip()
    mobile = (data.get("mobile") or "").strip()
    password = data.get("password") or ""

    if not agency_name or not email or not mobile or not password:
        return jsonify({"error": "Agency name, email, mobile and password are required"}), 400

    if db.get_agent_by_email(email):
        return jsonify({"error": "An account with this email already exists"}), 409

    password_hash = generate_password_hash(password)
    try:
        db.create_agent(agency_name, email, mobile, password_hash)
    except Exception:
        return jsonify({"error": "Could not create account, please try again"}), 500

    return jsonify({"message": "Registration successful. You can now log in."})


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""

    agent = db.get_agent_by_email(email)
    if not agent or not check_password_hash(agent["password_hash"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    return jsonify({
        "message": "Login successful",
        "agent": {"agency_name": agent["agency_name"], "email": agent["email"]},
    })


# ---------------------------------------------------------------------------
# Newsletter
# ---------------------------------------------------------------------------

@app.route("/api/newsletter", methods=["POST"])
def newsletter():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()

    if not email or "@" not in email:
        return jsonify({"error": "A valid email is required"}), 400

    db.add_newsletter_subscriber(email)
    return jsonify({"message": "Subscribed successfully"})


# ---------------------------------------------------------------------------
# Bookings / Razorpay payments
# ---------------------------------------------------------------------------

@app.route("/api/create-order", methods=["POST"])
def create_order():
    data = request.get_json(silent=True) or {}
    amount = int(data.get("amount") or 0)

    if amount < 100:
        return jsonify({"error": "Amount must be at least INR 1.00"}), 400

    # The passenger-details step (step 2) must run before payment — reject
    # any order that arrives without at least one passenger on file.
    passengers = data.get("passengers") or []
    if not isinstance(passengers, list) or len(passengers) == 0:
        return jsonify({"error": "Passenger details are required before payment"}), 400

    contact_email = (data.get("contactEmail") or "").strip()
    contact_mobile = (data.get("contactMobile") or "").strip()
    if not contact_email or not contact_mobile:
        return jsonify({"error": "Contact email and mobile are required before payment"}), 400

    if razorpay is None:
        return jsonify({"error": "Install razorpay: pip install razorpay"}), 500

    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        return jsonify({"error": "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env"}), 500

    service = data.get("service", "B2B travel booking")
    route = data.get("route", "")
    traveller = data.get("traveller", "")
    travel_date = data.get("travelDate", "")
    travel_class = data.get("travelClass", "")
    gstin = data.get("gstin", "")
    special_requests = data.get("specialRequests", "")

    lead_pax = passengers[0]
    lead_pax_name = f"{lead_pax.get('title', '')} {lead_pax.get('firstName', '')} {lead_pax.get('lastName', '')}".strip(
    )

    client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    receipt = f"tdb2b_{uuid.uuid4().hex[:20]}"
    order = client.order.create(
        {
            "amount": amount,
            "currency": "INR",
            "receipt": receipt,
            "payment_capture": 1,
            "notes": {
                "service": service,
                "traveller": traveller,
                "route": route,
                "lead_passenger": lead_pax_name,
                "passenger_count": str(len(passengers)),
                "travel_date": travel_date,
                "travel_class": travel_class,
                "contact_email": contact_email,
                "contact_mobile": contact_mobile,
            },
        }
    )

    # Persist the booking as soon as the order is created, status = "created".
    db.create_booking(
        order_id=order["id"],
        traveller_name=traveller,
        service=service,
        route=route,
        amount_paise=amount,
        passenger_details=json.dumps(passengers),
        travel_date=travel_date,
        travel_class=travel_class,
        contact_email=contact_email,
        contact_mobile=contact_mobile,
        gstin=gstin,
        special_requests=special_requests,
    )

    return jsonify({"order": order, "key": RAZORPAY_KEY_ID})


@app.route("/api/verify-payment", methods=["POST"])
def verify_payment():
    data = request.get_json(silent=True) or {}

    if razorpay is None or not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        return jsonify({"verified": False, "error": "Razorpay is not configured"}), 500

    order_id = data.get("razorpay_order_id")

    client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": order_id,
                "razorpay_payment_id": data["razorpay_payment_id"],
                "razorpay_signature": data["razorpay_signature"],
            }
        )
    except Exception:
        if order_id:
            db.mark_booking_failed(order_id)
        return jsonify({"verified": False}), 400

    if order_id:
        db.mark_booking_paid(order_id, data.get("razorpay_payment_id", ""))

    return jsonify({"verified": True})


@app.route("/api/bookings", methods=["GET"])
def bookings():
    """Simple listing endpoint, handy for an admin view or manual checks."""
    return jsonify({"bookings": db.list_bookings()})


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
