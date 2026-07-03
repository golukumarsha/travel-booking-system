const authGate = document.getElementById("authGate");
const siteContent = document.getElementById("siteContent");
const welcomeAgent = document.getElementById("welcomeAgent");
const logoutBtn = document.getElementById("logoutBtn");

const authTabs = document.querySelectorAll(".auth-tab");
const authForms = document.querySelectorAll(".auth-form");

const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");
const forgotBtn = document.getElementById("forgotBtn");
const fareCards = document.querySelectorAll(".fare-card");
const flightSearch = document.getElementById("flightSearch");
const flightSearchCount = document.getElementById("flightSearchCount");
const fareNoResults = document.getElementById("fareNoResults");
const bookingForm = document.getElementById("bookingForm");
const bookingSection = document.getElementById("booking");
const bookingSummary = document.getElementById("bookingSummary");
const paymentStatus = document.getElementById("paymentStatus");
const registerForm = document.getElementById("registerForm");
const registerStatus = document.getElementById("registerStatus");
const newsletterForm = document.getElementById("newsletterForm");

const passengerSection = document.getElementById("passengerDetails");
const passengerForm = document.getElementById("passengerForm");
const passengerStatus = document.getElementById("passengerStatus");
const passengerFareSummary = document.getElementById("passengerFareSummary");
const passengerCountSelect = document.getElementById("passengerCount");
const passengerRowsContainer = document.getElementById("passengerRows");
const backToFaresBtn = document.getElementById("backToFaresBtn");
const editDetailsBtn = document.getElementById("editDetailsBtn");

// Holds everything collected about the current fare + traveller so it can be
// sent along with the Razorpay order once the agent reaches step 3.
let selectedFare = null;
let collectedPassengerDetails = null;

function setStatus(element, message, type = "") {
  element.textContent = message;
  element.classList.remove("is-success", "is-error");
  if (type) element.classList.add(`is-${type}`);
}

function formatRupees(paise) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(paise) / 100);
}

// ---------------------------------------------------------------------------
// Auth gate: show login/register first, reveal the rest of the site after
// a successful login (or a successful registration, which auto-logs in).
// ---------------------------------------------------------------------------

function showSite(agent) {
  authGate.classList.add("is-hidden");
  siteContent.classList.remove("is-hidden");
  welcomeAgent.textContent = agent ? `Welcome, ${agent.agency_name}` : "";
  if (agent) sessionStorage.setItem("agent", JSON.stringify(agent));
}

function showGate() {
  siteContent.classList.add("is-hidden");
  authGate.classList.remove("is-hidden");
  sessionStorage.removeItem("agent");
}

// If the agent already logged in earlier this browser session, skip the gate.
const savedAgent = sessionStorage.getItem("agent");
if (savedAgent) {
  showSite(JSON.parse(savedAgent));
} else {
  showGate();
}

function switchAuthTab(tabName) {
  authTabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === tabName));
  authForms.forEach((f) => {
    const isTarget = f.dataset.panel === tabName;
    f.classList.toggle("is-active", isTarget);
    // Set inline display directly so this works even if the CSS file
    // hasn't refreshed in the browser (avoids both forms showing at once).
    f.style.display = isTarget ? "grid" : "none";
  });
}

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => switchAuthTab(tab.dataset.tab));
});

// Make sure only the Login form is visible when the page first loads.
switchAuthTab("login");

logoutBtn.addEventListener("click", () => {
  showGate();
  switchAuthTab("login");
  loginForm.reset();
});

// ---------------------------------------------------------------------------
// Fare selection
// ---------------------------------------------------------------------------

fareCards.forEach((card) => {
  card.addEventListener("click", () => {
    fareCards.forEach((item) => item.classList.remove("is-active"));
    card.classList.add("is-active");

    selectedFare = {
      service: card.dataset.service,
      route: card.dataset.route,
      amountPaise: card.dataset.amount,
      airline: card.dataset.airline,
      origin: card.dataset.origin,
      destination: card.dataset.destination,
    };

    // Keep the hidden payment-form fields in sync so nothing breaks if the
    // agent skips straight to step 3 later in the flow.
    document.getElementById("serviceName").value = selectedFare.service;
    document.getElementById("routeName").value = selectedFare.route;
    document.getElementById("amountPaise").value = selectedFare.amountPaise;

    // Reset any previously collected passenger info — a new fare means a
    // fresh set of traveller details before we let them pay.
    collectedPassengerDetails = null;
    passengerForm.reset();
    setStatus(passengerStatus, "");
    bookingSection.classList.add("is-hidden");

    passengerFareSummary.textContent =
      `${selectedFare.service} · ${selectedFare.route} · ${selectedFare.airline} · ${formatRupees(selectedFare.amountPaise)}`;

    renderPassengerRows(Number(passengerCountSelect.value || 1));

    passengerSection.classList.remove("is-hidden");
    passengerSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

// ---------------------------------------------------------------------------
// Passenger details (step 2): collects the same information an airline asks
// for before payment — passenger names, DOB, passport, contact & billing.
// ---------------------------------------------------------------------------

// Populate the "number of passengers" dropdown (1–9, airline-style).
for (let i = 1; i <= 9; i += 1) {
  const option = document.createElement("option");
  option.value = String(i);
  option.textContent = `${i} Passenger${i > 1 ? "s" : ""}`;
  passengerCountSelect.appendChild(option);
}

function renderPassengerRows(count) {
  passengerRowsContainer.innerHTML = "";
  for (let i = 1; i <= count; i += 1) {
    const row = document.createElement("div");
    row.className = "passenger-row";
    row.innerHTML = `
      <span class="passenger-row-title">Passenger ${i}</span>
      <div class="passenger-row-grid">
        <label>
          Title
          <select class="pax-title" required>
            <option value="Mr">Mr</option>
            <option value="Mrs">Mrs</option>
            <option value="Ms">Ms</option>
            <option value="Master">Master</option>
            <option value="Miss">Miss</option>
          </select>
        </label>
        <label>
          First name
          <input class="pax-first-name" type="text" placeholder="First name" required />
        </label>
        <label>
          Last name
          <input class="pax-last-name" type="text" placeholder="Last name" required />
        </label>
        <label>
          Gender
          <select class="pax-gender" required>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <label>
          Date of birth
          <input class="pax-dob" type="date" required />
        </label>
        <label>
          Nationality
          <input class="pax-nationality" type="text" value="Indian" required />
        </label>
        <label>
          Passport number <span class="optional-tag">(intl. only)</span>
          <input class="pax-passport" type="text" placeholder="Optional for domestic" />
        </label>
      </div>
    `;
    passengerRowsContainer.appendChild(row);
  }
}

renderPassengerRows(1);

passengerCountSelect.addEventListener("change", () => {
  renderPassengerRows(Number(passengerCountSelect.value));
});

backToFaresBtn.addEventListener("click", () => {
  passengerSection.classList.add("is-hidden");
  document.getElementById("fares").scrollIntoView({ behavior: "smooth", block: "start" });
});

passengerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!selectedFare) {
    setStatus(passengerStatus, "Please select a fare first.", "error");
    return;
  }

  const passengerRows = passengerRowsContainer.querySelectorAll(".passenger-row");
  const passengers = Array.from(passengerRows).map((row) => ({
    title: row.querySelector(".pax-title").value,
    firstName: row.querySelector(".pax-first-name").value.trim(),
    lastName: row.querySelector(".pax-last-name").value.trim(),
    gender: row.querySelector(".pax-gender").value,
    dob: row.querySelector(".pax-dob").value,
    nationality: row.querySelector(".pax-nationality").value.trim(),
    passport: row.querySelector(".pax-passport").value.trim(),
  }));

  const incomplete = passengers.some((p) => !p.firstName || !p.lastName || !p.dob);
  if (incomplete) {
    setStatus(passengerStatus, "Please fill in every passenger's name and date of birth.", "error");
    return;
  }

  collectedPassengerDetails = {
    travelDate: document.getElementById("travelDate").value,
    travelClass: document.getElementById("travelClass").value,
    passengers,
    contactEmail: document.getElementById("contactEmail").value.trim(),
    contactMobile: document.getElementById("contactMobile").value.trim(),
    gstin: document.getElementById("gstin").value.trim(),
    specialRequests: document.getElementById("specialRequests").value.trim(),
  };

  if (!collectedPassengerDetails.travelDate) {
    setStatus(passengerStatus, "Please choose a date of travel.", "error");
    return;
  }

  const leadPax = passengers[0];
  document.getElementById("travellerName").value = `${leadPax.title} ${leadPax.firstName} ${leadPax.lastName}`;
  document.getElementById("routeName").value = selectedFare.route;
  document.getElementById("amountPaise").value = selectedFare.amountPaise;
  document.getElementById("serviceName").value = selectedFare.service;

  renderBookingSummary();

  setStatus(passengerStatus, "");
  passengerSection.classList.add("is-hidden");
  bookingSection.classList.remove("is-hidden");
  bookingSection.scrollIntoView({ behavior: "smooth", block: "start" });
});

editDetailsBtn.addEventListener("click", () => {
  bookingSection.classList.add("is-hidden");
  passengerSection.classList.remove("is-hidden");
  passengerSection.scrollIntoView({ behavior: "smooth", block: "start" });
});

function renderBookingSummary() {
  if (!selectedFare || !collectedPassengerDetails) return;

  const paxNames = collectedPassengerDetails.passengers
    .map((p) => `${p.title} ${p.firstName} ${p.lastName}`)
    .join(", ");

  bookingSummary.innerHTML = `
    <strong>${selectedFare.service} — ${selectedFare.route}</strong>
    <div class="summary-line">Airline: ${selectedFare.airline}</div>
    <div class="summary-line">Travel date: ${collectedPassengerDetails.travelDate} · ${collectedPassengerDetails.travelClass}</div>
    <div class="summary-line">Passengers (${collectedPassengerDetails.passengers.length}): ${paxNames}</div>
    <div class="summary-line">Contact: ${collectedPassengerDetails.contactEmail} · ${collectedPassengerDetails.contactMobile}</div>
    <div class="summary-line">Amount: ${formatRupees(selectedFare.amountPaise)}</div>
  `;
}

// ---------------------------------------------------------------------------
// Flight search: filters the Popular B2B deals grid live as the agent types.
// Matches against route, airline, origin city, destination city and service name.
// ---------------------------------------------------------------------------

if (flightSearch) {
  flightSearch.addEventListener("input", () => {
    const query = flightSearch.value.trim().toLowerCase();
    let visibleCount = 0;

    fareCards.forEach((card) => {
      const haystack = [
        card.dataset.route,
        card.dataset.airline,
        card.dataset.origin,
        card.dataset.destination,
        card.dataset.service,
      ]
        .join(" ")
        .toLowerCase();

      const matches = query === "" || haystack.includes(query);
      card.classList.toggle("is-filtered-out", !matches);
      if (matches) visibleCount += 1;
    });

    fareNoResults.classList.toggle("is-hidden", visibleCount > 0);
    flightSearchCount.textContent =
      query === "" ? "" : `${visibleCount} flight${visibleCount === 1 ? "" : "s"} found`;
  });
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = loginForm.querySelector('input[type="email"]').value.trim();
  const password = loginForm.querySelector('input[type="password"]').value;

  setStatus(loginStatus, "Logging in...");
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Login failed.");
    setStatus(loginStatus, `Welcome back, ${payload.agent.agency_name}!`, "success");
    showSite(payload.agent);
  } catch (error) {
    setStatus(loginStatus, error.message, "error");
  }
});

forgotBtn.addEventListener("click", () => {
  setStatus(loginStatus, "Password reset OTP flow is ready for backend email/SMS integration.", "success");
});

// ---------------------------------------------------------------------------
// Register (auto-logs in on success so the site unlocks right away)
// ---------------------------------------------------------------------------

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const agency_name = document.getElementById("regAgencyName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const mobile = document.getElementById("regMobile").value.trim();
  const password = document.getElementById("regPassword").value;

  setStatus(registerStatus, "Creating your account...");
  try {
    const response = await fetch("/api/register-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agency_name, email, mobile, password }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Registration failed.");

    setStatus(registerStatus, "Account created, logging you in...", "success");

    const loginResponse = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const loginPayload = await loginResponse.json();
    if (!loginResponse.ok) throw new Error("Registered, but auto-login failed. Please log in manually.");

    registerForm.reset();
    showSite(loginPayload.agent);
  } catch (error) {
    setStatus(registerStatus, error.message, "error");
  }
});

// ---------------------------------------------------------------------------
// Newsletter
// ---------------------------------------------------------------------------

newsletterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("newsletterEmail").value.trim();

  try {
    const response = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Subscription failed.");
    newsletterForm.reset();
    alert("Subscribed successfully!");
  } catch (error) {
    alert(error.message);
  }
});

// ---------------------------------------------------------------------------
// Booking / Razorpay checkout
// ---------------------------------------------------------------------------

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!collectedPassengerDetails) {
    setStatus(paymentStatus, "Please complete passenger details first.", "error");
    return;
  }

  const amount = Number(document.getElementById("amountPaise").value);
  const service = document.getElementById("serviceName").value;
  const route = document.getElementById("routeName").value.trim();
  const traveller = document.getElementById("travellerName").value.trim();

  if (!window.Razorpay) {
    setStatus(paymentStatus, "Razorpay Checkout script could not be loaded.", "error");
    return;
  }

  setStatus(paymentStatus, "Creating secure Razorpay order...");

  try {
    const response = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        service,
        route,
        traveller,
        travelDate: collectedPassengerDetails.travelDate,
        travelClass: collectedPassengerDetails.travelClass,
        passengers: collectedPassengerDetails.passengers,
        contactEmail: collectedPassengerDetails.contactEmail,
        contactMobile: collectedPassengerDetails.contactMobile,
        gstin: collectedPassengerDetails.gstin,
        specialRequests: collectedPassengerDetails.specialRequests,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Unable to create Razorpay order.");
    }

    const options = {
      key: payload.key,
      amount: payload.order.amount,
      currency: payload.order.currency,
      name: "Traveldeal B2B",
      description: `${service} - ${route}`,
      order_id: payload.order.id,
      prefill: {
        name: traveller,
        email: collectedPassengerDetails.contactEmail || "agent@example.com",
        contact: collectedPassengerDetails.contactMobile || "9876543210",
      },
      notes: {
        service,
        route,
        traveller,
        travel_date: collectedPassengerDetails.travelDate,
        travel_class: collectedPassengerDetails.travelClass,
        passenger_count: String(collectedPassengerDetails.passengers.length),
      },
      theme: { color: "#22115c" },
      handler: async (payment) => {
        setStatus(paymentStatus, "Verifying payment signature...");
        const verifyResponse = await fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payment),
        });
        const verifyPayload = await verifyResponse.json();
        if (verifyResponse.ok && verifyPayload.verified) {
          setStatus(paymentStatus, `Payment verified: ${payment.razorpay_payment_id}`, "success");
        } else {
          setStatus(paymentStatus, "Payment completed but signature verification failed.", "error");
        }
      },
      modal: {
        ondismiss: () => setStatus(paymentStatus, "Payment window closed before completion."),
      },
    };

    const checkout = new Razorpay(options);
    checkout.on("payment.failed", (response) => {
      setStatus(paymentStatus, response.error.description || "Payment failed.", "error");
    });
    checkout.open();
  } catch (error) {
    setStatus(paymentStatus, error.message, "error");
  }
});