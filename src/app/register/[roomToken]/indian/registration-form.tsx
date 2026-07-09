"use client";

import { useActionState, useRef, useState } from "react";
import { registerIndianGuest, type RegisterIndianGuestState } from "./actions";

type Plan = { code: string; name: string; description: string };

// Step index constants — the numbers are stable identifiers used as
// data-step attributes and in the navigation sequence array.
const S_DETAILS = 0;
const S_GUESTS = 1;
const S_ARRIVAL = 2;
const S_ROOM = 3;
const S_RULES = 4;
const S_PAYMENT = 5;

const STEP_LABEL: Record<number, string> = {
  0: "Details",
  1: "Guests",
  2: "Arrival",
  3: "Room",
  4: "Rules",
  5: "Payment",
};

const PAYMENT_OPTIONS = [
  { value: "online", label: "Pay Online", sub: "Secure payment now via Razorpay" },
  { value: "cash", label: "Pay in Cash", sub: "Pay at property on arrival" },
  { value: "credit_card", label: "Credit / Debit Card", sub: "Card charged at property on arrival" },
] as const;

const PAYMENT_DISPLAY: Record<string, string> = {
  online: "Online (Razorpay)",
  cash: "Cash at property",
  credit_card: "Card at property",
};

const HOUSE_RULES = [
  "Room Service is available.",
  "Smoking or Drinking Alcohol is not allowed in Property/Room.",
  "Garden area is for Guest for sitting only, plucking Flowers is not allowed.",
  "Parking of Vehicle will be allowed in property till the guest is himself available in the property.",
  "Washing of parked vehicle is not allowed in property.",
  "Free Wi-Fi Available. Guest is himself responsible for any misuse of Internet.",
  "Any kind of damage in room/property will be responsibility for the guest and will be chargeable.",
  "We will not be responsible for anything lost.",
  "We don't allow any outside food ordered by guest.",
  "Pets are not allowed in the property.",
  "Only 3 adults are allowed in 1 Room.",
  "2 Children below the age of 5 years are allowed in the Room.",
  "Additional features such as cooler/blower is not included in any package or in booking.",
  "Attached Aadhaar copy of all the guests will be kept for the purpose of security reasons.",
];

type AddlGuest = {
  fullName: string;
  age: string;
  sex: string;
  address: string;
  aadhaarNumber: string;
  phone: string;
  email: string;
};

const blank: AddlGuest = {
  fullName: "",
  age: "",
  sex: "",
  address: "",
  aadhaarNumber: "",
  phone: "",
  email: "",
};

const initialState: RegisterIndianGuestState = { error: null };

const inputCls =
  "w-full rounded-xl border border-walnut/20 bg-white px-4 py-3 text-base text-walnut placeholder:text-walnut/40 focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/30";

const labelCls = "mb-1.5 block text-sm font-medium text-walnut";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function nowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function IndianRegistrationForm({
  roomToken,
  roomLabel,
  plans,
  whatsappNumber,
}: {
  roomToken: string;
  roomLabel: string;
  plans: Plan[];
  whatsappNumber: string;
}) {
  const [state, formAction, pending] = useActionState(
    registerIndianGuest.bind(null, roomToken),
    initialState,
  );

  const [step, setStep] = useState(S_DETAILS);
  const [numGuests, setNumGuests] = useState(1);
  const [addlGuests, setAddlGuests] = useState<AddlGuest[]>([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [svcInput, setSvcInput] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [stepError, setStepError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Sequence of step indices to visit — step 1 (additional guests) is
  // included only when the primary guest declares more than one person.
  const visibleSteps = numGuests > 1
    ? [S_DETAILS, S_GUESTS, S_ARRIVAL, S_ROOM, S_RULES, S_PAYMENT]
    : [S_DETAILS, S_ARRIVAL, S_ROOM, S_RULES, S_PAYMENT];

  const visiblePos = visibleSteps.indexOf(step);

  function goNext() {
    setStepError(null);
    // Validate the current step's HTML inputs first.
    const fieldset = formRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`);
    if (fieldset) {
      const inputs = fieldset.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >("input:not([type=hidden]), select, textarea");
      for (const el of inputs) {
        if (!el.reportValidity()) return;
      }
    }
    // Custom validation for steps whose required value lives in React state.
    if (step === S_ROOM && !selectedPlan) {
      setStepError("Please select a room plan to continue.");
      return;
    }
    const next = visibleSteps[visiblePos + 1];
    if (next !== undefined) setStep(next);
  }

  function goBack() {
    setStepError(null);
    const prev = visibleSteps[visiblePos - 1];
    if (prev !== undefined) setStep(prev);
  }

  function changeNumGuests(n: number) {
    setNumGuests(n);
    setAddlGuests((cur) => {
      const needed = n - 1;
      if (cur.length < needed) {
        return [
          ...cur,
          ...Array.from({ length: needed - cur.length }, () => ({ ...blank })),
        ];
      }
      return cur.slice(0, needed);
    });
  }

  function updateAddl(i: number, field: keyof AddlGuest, val: string) {
    setAddlGuests((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)),
    );
  }

  function addService() {
    const t = svcInput.trim();
    if (t && !services.includes(t)) setServices((s) => [...s, t]);
    setSvcInput("");
  }

  function removeService(i: number) {
    setServices((s) => s.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!paymentMode) {
      e.preventDefault();
      setStepError("Please select a payment method to continue.");
    }
  }

  const addlJson = JSON.stringify(addlGuests.slice(0, numGuests - 1));
  const servicesJson = JSON.stringify(services);
  const displayError = stepError ?? state.error;

  // ── Thank you screen ─────────────────────────────────────────────────────
  if (state.success) {
    const { token, guestName, roomType, checkinDate, paymentMode: pMode, phone } =
      state.success;
    const stayLink = `${window.location.origin}/stay/${token}`;
    const guestDigits = phone.replace(/\D/g, "");
    const waText = [
      `Hi ${guestName}! 👋`,
      `Here is your Highway Heaven stay dashboard link:`,
      stayLink,
      ``,
      `We wish you a happy stay. 🏔️`,
    ].join("\n");
    const waHref = `https://wa.me/91${guestDigits}?text=${encodeURIComponent(waText)}`;

    return (
      <div className="mx-auto w-full max-w-md px-4 py-12 text-center">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-saffron/15">
              <svg
                className="h-8 w-8 text-saffron-dark"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <h1 className="font-serif text-2xl font-bold text-walnut">
            Welcome to Highway Heaven!
          </h1>
          <p className="mt-2 text-sm text-walnut/60">
            Your stay has been registered.
          </p>

          <dl className="mt-6 space-y-2 rounded-xl bg-cream px-5 py-4 text-left text-sm">
            {[
              ["Name", guestName],
              ["Room plan", roomType],
              ["Arrival", checkinDate],
              ["Payment", PAYMENT_DISPLAY[pMode] ?? pMode],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="font-medium text-walnut">{label}</dt>
                <dd className="text-right text-walnut/70">{value}</dd>
              </div>
            ))}
          </dl>

          <a
            href={`/stay/${token}`}
            className="mt-6 block w-full rounded-xl bg-saffron py-3.5 text-base font-semibold text-white shadow-sm"
          >
            Go to your stay dashboard
          </a>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block w-full rounded-xl bg-green-500 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-green-600"
          >
            📲 Share link via WhatsApp
          </a>
        </div>
      </div>
    );
  }

  // ── Multi-step form ───────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-walnut">
          Welcome to Highway Heaven
        </h1>
        <p className="mt-1 text-sm text-walnut/70">
          Indian guest registration — {roomLabel}
        </p>
      </div>

      {/* Stepper */}
      <ol className="mb-8 flex items-center justify-between">
        {visibleSteps.map((sIdx, pos) => (
          <li key={sIdx} className="relative flex flex-1 flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                pos <= visiblePos
                  ? "bg-saffron text-white"
                  : "bg-walnut/10 text-walnut/50"
              }`}
            >
              {pos + 1}
            </div>
            <span className="mt-1 text-center text-[10px] leading-tight text-walnut/60">
              {STEP_LABEL[sIdx]}
            </span>
            {pos < visibleSteps.length - 1 && (
              <div
                className={`absolute left-0 top-4 -z-10 h-0.5 w-full ${
                  pos < visiblePos ? "bg-saffron" : "bg-walnut/10"
                }`}
              />
            )}
          </li>
        ))}
      </ol>

      <form
        ref={formRef}
        action={formAction}
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white p-5 shadow-sm"
      >
        {/* Hidden carrier fields */}
        <input type="hidden" name="additionalGuestsJson" value={addlJson} />
        <input type="hidden" name="servicesJson" value={servicesJson} />
        <input type="hidden" name="selectedPlan" value={selectedPlan} />
        <input type="hidden" name="paymentMode" value={paymentMode} />
        <input type="hidden" name="numGuests" value={numGuests} />

        {/* ── Step 0: Your Details ───────────────────────────────────────── */}
        <fieldset data-step={S_DETAILS} hidden={step !== S_DETAILS} className="space-y-4">
          <div>
            <label className={labelCls} htmlFor="fullName">
              Full Name *
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              placeholder="As per your Aadhaar card"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="address">
              Address *
            </label>
            <textarea
              id="address"
              name="address"
              required
              rows={2}
              placeholder="Your current address"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="city">
                City *
              </label>
              <input
                id="city"
                name="city"
                type="text"
                required
                placeholder="e.g. Srinagar"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="country">
                Country *
              </label>
              <input
                id="country"
                name="country"
                type="text"
                required
                defaultValue="India"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="phone">
              Mobile Number *
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              pattern="[6-9][0-9]{9}"
              maxLength={10}
              placeholder="10-digit mobile number"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="age">
                Age *
              </label>
              <input
                id="age"
                name="age"
                type="number"
                required
                min={1}
                max={120}
                placeholder="e.g. 30"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="gender">
                Gender *
              </label>
              <select id="gender" name="gender" required defaultValue="" className={inputCls}>
                <option value="" disabled>Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="aadhaarNumber">
              Aadhaar Number *
            </label>
            <input
              id="aadhaarNumber"
              name="aadhaarNumber"
              type="text"
              required
              inputMode="numeric"
              pattern="[0-9]{12}"
              maxLength={12}
              placeholder="12-digit Aadhaar number"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="purposeOfVisit">
              Purpose of Visit *
            </label>
            <input
              id="purposeOfVisit"
              name="purposeOfVisit"
              type="text"
              required
              placeholder="e.g. Tourism, Business"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="email">
              Email Address (optional)
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="aadhaarFront">
              Aadhaar Card — Front *
            </label>
            <input
              id="aadhaarFront"
              name="aadhaarFront"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className={`${inputCls} file:mr-3 file:rounded-lg file:border-0 file:bg-saffron file:px-3 file:py-2 file:text-white`}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="aadhaarBack">
              Aadhaar Card — Back *
            </label>
            <input
              id="aadhaarBack"
              name="aadhaarBack"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className={`${inputCls} file:mr-3 file:rounded-lg file:border-0 file:bg-saffron file:px-3 file:py-2 file:text-white`}
            />
          </div>
          <div>
            <label className={labelCls}>Number of Guests *</label>
            <div className="flex gap-3">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => changeNumGuests(n)}
                  className={`flex-1 rounded-xl border py-3 text-base font-semibold transition ${
                    numGuests === n
                      ? "border-saffron bg-saffron text-white"
                      : "border-walnut/20 bg-white text-walnut hover:border-saffron/50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-walnut/50">
              Maximum 3 guests per room
            </p>
          </div>
        </fieldset>

        {/* ── Step 1: Additional Guests ──────────────────────────────────── */}
        <fieldset data-step={S_GUESTS} hidden={step !== S_GUESTS} className="space-y-4">
          <p className="text-sm text-walnut/70">
            Please fill in details for the other{" "}
            {numGuests - 1 === 1 ? "guest" : `${numGuests - 1} guests`} sharing
            the room.
          </p>

          {addlGuests.slice(0, numGuests - 1).map((g, i) => (
            <div
              key={i}
              className="space-y-3 rounded-xl border border-walnut/15 bg-cream p-4"
            >
              <p className="text-sm font-semibold text-walnut">
                Guest {i + 2}
              </p>
              <div>
                <label className={labelCls}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={g.fullName}
                  onChange={(e) => updateAddl(i, "fullName", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Age *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={120}
                    value={g.age}
                    onChange={(e) => updateAddl(i, "age", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Sex *</label>
                  <select
                    required
                    value={g.sex}
                    onChange={(e) => updateAddl(i, "sex", e.target.value)}
                    className={inputCls}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Aadhaar Number *</label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{12}"
                  maxLength={12}
                  value={g.aadhaarNumber}
                  onChange={(e) =>
                    updateAddl(i, "aadhaarNumber", e.target.value)
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Address (optional)</label>
                <input
                  type="text"
                  value={g.address}
                  onChange={(e) => updateAddl(i, "address", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Phone (optional — to receive stay link)
                </label>
                <input
                  type="tel"
                  value={g.phone}
                  onChange={(e) => updateAddl(i, "phone", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Email (optional — to receive stay link)
                </label>
                <input
                  type="email"
                  value={g.email}
                  onChange={(e) => updateAddl(i, "email", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Aadhaar — Front *</label>
                <input
                  type="file"
                  required
                  name={`addlFront_${i}`}
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className={`${inputCls} file:mr-3 file:rounded-lg file:border-0 file:bg-saffron file:px-3 file:py-2 file:text-white`}
                />
              </div>
              <div>
                <label className={labelCls}>Aadhaar — Back *</label>
                <input
                  type="file"
                  required
                  name={`addlBack_${i}`}
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className={`${inputCls} file:mr-3 file:rounded-lg file:border-0 file:bg-saffron file:px-3 file:py-2 file:text-white`}
                />
              </div>
            </div>
          ))}
        </fieldset>

        {/* ── Step 2: Arrival Details ────────────────────────────────────── */}
        <fieldset data-step={S_ARRIVAL} hidden={step !== S_ARRIVAL} className="space-y-4">
          <div>
            <label className={labelCls} htmlFor="checkinDate">
              Date of Arrival *
            </label>
            <input
              id="checkinDate"
              name="checkinDate"
              type="date"
              required
              defaultValue={todayStr()}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="checkinTime">
              Time of Arrival *
            </label>
            <input
              id="checkinTime"
              name="checkinTime"
              type="time"
              required
              defaultValue={nowTimeStr()}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="checkoutDate">
              Date of Departure *
            </label>
            <input
              id="checkoutDate"
              name="checkoutDate"
              type="date"
              required
              min={todayStr()}
              className={inputCls}
            />
          </div>
        </fieldset>

        {/* ── Step 3: Room Type + Services ──────────────────────────────── */}
        <fieldset data-step={S_ROOM} hidden={step !== S_ROOM} className="space-y-5">
          <div>
            <label className={labelCls}>Room Plan *</label>
            <div className="space-y-2">
              {plans.length === 0 && (
                <p className="rounded-xl border border-walnut/10 bg-cream p-4 text-sm text-walnut/60">
                  No active plans found — please contact the property.
                </p>
              )}
              {plans.map((plan) => (
                <button
                  key={plan.code}
                  type="button"
                  onClick={() => setSelectedPlan(plan.code)}
                  className={`w-full rounded-xl border-2 p-4 text-left transition ${
                    selectedPlan === plan.code
                      ? "border-saffron bg-saffron/5"
                      : "border-walnut/15 bg-white hover:border-walnut/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        selectedPlan === plan.code
                          ? "bg-saffron text-white"
                          : "bg-walnut/10 text-walnut/60"
                      }`}
                    >
                      {plan.code}
                    </div>
                    <div>
                      <p className="font-semibold text-walnut">{plan.name}</p>
                      <p className="text-xs text-walnut/60">
                        {plan.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>
              Additional Service Requests (optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={svcInput}
                onChange={(e) => setSvcInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addService();
                  }
                }}
                placeholder="Type and press Enter to add"
                className={inputCls}
              />
              <button
                type="button"
                onClick={addService}
                className="shrink-0 rounded-xl bg-saffron/10 px-4 text-sm font-semibold text-saffron-dark hover:bg-saffron/20"
              >
                Add
              </button>
            </div>
            {services.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {services.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full bg-saffron/10 px-3 py-1 text-sm text-walnut"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeService(i)}
                      aria-label="Remove"
                      className="text-walnut/40 hover:text-maroon"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </fieldset>

        {/* ── Step 4: House Rules ────────────────────────────────────────── */}
        <fieldset data-step={S_RULES} hidden={step !== S_RULES} className="space-y-4">
          <div className="max-h-64 overflow-y-auto rounded-xl border border-walnut/15 bg-cream p-4">
            <h2 className="mb-2 font-semibold text-walnut">House Rules</h2>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-walnut/80">
              {HOUSE_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
          </div>
          <label className="flex items-start gap-2.5 text-sm text-walnut">
            <input
              type="checkbox"
              name="agreedToHouseRules"
              required
              className="mt-0.5 h-5 w-5 rounded border-walnut/30 text-saffron focus:ring-saffron"
            />
            I have read and agree to the house rules above.
          </label>
        </fieldset>

        {/* ── Step 5: Payment Mode ───────────────────────────────────────── */}
        <fieldset data-step={S_PAYMENT} hidden={step !== S_PAYMENT} className="space-y-3">
          <label className={labelCls}>Select Payment Mode *</label>
          {PAYMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setPaymentMode(opt.value);
                setStepError(null);
              }}
              className={`w-full rounded-xl border-2 p-4 text-left transition ${
                paymentMode === opt.value
                  ? "border-saffron bg-saffron/5"
                  : "border-walnut/15 bg-white hover:border-walnut/30"
              }`}
            >
              <p className="font-semibold text-walnut">{opt.label}</p>
              <p className="mt-0.5 text-xs text-walnut/60">{opt.sub}</p>
            </button>
          ))}
        </fieldset>

        {/* Error banner (step-local or server-returned) */}
        {displayError && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-maroon/10 px-4 py-2.5 text-sm text-maroon"
          >
            {displayError}
          </p>
        )}

        {/* Navigation */}
        <div className="mt-6 flex gap-3">
          {visiblePos > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="flex-1 rounded-xl border border-walnut/20 bg-white py-3.5 text-base font-semibold text-walnut"
            >
              Back
            </button>
          )}
          {visiblePos < visibleSteps.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex-1 rounded-xl bg-saffron py-3.5 text-base font-semibold text-white shadow-sm active:bg-saffron-dark"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-xl bg-maroon py-3.5 text-base font-semibold text-white shadow-sm disabled:opacity-60"
            >
              {pending ? "Registering…" : "Complete Registration"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
