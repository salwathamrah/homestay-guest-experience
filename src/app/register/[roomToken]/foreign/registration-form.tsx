"use client";

import { useActionState, useRef, useState } from "react";
import {
  registerForeignGuest,
  type RegisterForeignGuestState,
} from "./actions";

const STEPS = [
  "Personal Details",
  "Visit Details",
  "Travel Documents",
  "Additional Guests",
  "House Rules",
] as const;

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

type AdditionalGuestRow = {
  fullName: string;
  age: string;
  sex: string;
  address: string;
  passportNumber: string;
};

const emptyRow: AdditionalGuestRow = {
  fullName: "",
  age: "",
  sex: "",
  address: "",
  passportNumber: "",
};

const initialState: RegisterForeignGuestState = { error: null };

const inputClass =
  "w-full rounded-xl border border-walnut/20 bg-white px-4 py-3 text-base text-walnut placeholder:text-walnut/40 focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/30";

const labelClass = "mb-1.5 block text-sm font-medium text-walnut";

export function ForeignRegistrationForm({
  roomToken,
  roomLabel,
}: {
  roomToken: string;
  roomLabel: string;
}) {
  const boundAction = registerForeignGuest.bind(null, roomToken);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [step, setStep] = useState(0);
  const [guests, setGuests] = useState<AdditionalGuestRow[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  function goNext() {
    const stepEl = formRef.current?.querySelector(`[data-step="${step}"]`);
    if (!stepEl) return;

    const inputs = stepEl.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input, select, textarea");

    for (const input of inputs) {
      if (!input.reportValidity()) return;
    }

    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0));
  }

  function addGuestRow() {
    setGuests((rows) => [...rows, { ...emptyRow }]);
  }

  function removeGuestRow(index: number) {
    setGuests((rows) => rows.filter((_, i) => i !== index));
  }

  function updateGuestRow(index: number, field: keyof AdditionalGuestRow, value: string) {
    setGuests((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  const additionalGuestsJson = JSON.stringify(
    guests
      .filter((g) => g.fullName.trim())
      .map((g) => ({
        fullName: g.fullName.trim(),
        age: Number(g.age),
        sex: g.sex,
        address: g.address.trim() || null,
        passportNumber: g.passportNumber.trim() || null,
      })),
  );

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-walnut">Welcome to Highway Heaven</h1>
        <p className="mt-1 text-sm text-walnut/70">Foreign guest registration — {roomLabel}</p>
      </div>

      <ol className="mb-8 flex items-center justify-between">
        {STEPS.map((label, index) => (
          <li key={label} className="relative flex flex-1 flex-col items-center">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                index <= step ? "bg-saffron text-white" : "bg-walnut/10 text-walnut/50"
              }`}
            >
              {index + 1}
            </div>
            <span className="mt-1.5 text-center text-[10px] leading-tight text-walnut/70">
              {label}
            </span>
            {index < STEPS.length - 1 && (
              <div
                className={`absolute left-0 top-[18px] -z-10 h-0.5 w-full ${
                  index < step ? "bg-saffron" : "bg-walnut/10"
                }`}
              />
            )}
          </li>
        ))}
      </ol>

      <form ref={formRef} action={formAction} className="rounded-2xl bg-white p-5 shadow-sm">
        <input type="hidden" name="additionalGuestsJson" value={additionalGuestsJson} />

        <fieldset data-step={0} hidden={step !== 0} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="firstName">First Name</label>
              <input id="firstName" name="firstName" type="text" required autoComplete="given-name" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="lastName">Last Name</label>
              <input id="lastName" name="lastName" type="text" required autoComplete="family-name" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="nationality">Nationality</label>
            <input id="nationality" name="nationality" type="text" required placeholder="e.g. British, American" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="countryOfOrigin">Country of Origin</label>
            <input id="countryOfOrigin" name="countryOfOrigin" type="text" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="cellPhone">Cell Phone</label>
            <input id="cellPhone" name="cellPhone" type="tel" required autoComplete="tel" placeholder="+1 555 123 4567" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="email">Email Address</label>
            <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="homeAddress">Full Address (home country)</label>
            <textarea id="homeAddress" name="homeAddress" required rows={2} className={inputClass} />
          </div>
        </fieldset>

        <fieldset data-step={1} hidden={step !== 1} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="purposeOfVisit">Purpose of Visit</label>
            <input id="purposeOfVisit" name="purposeOfVisit" type="text" required placeholder="e.g. Tourism" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="arrivalDate">Date of Arrival</label>
              <input id="arrivalDate" name="arrivalDate" type="date" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="arrivalTime">Time of Arrival</label>
              <input id="arrivalTime" name="arrivalTime" type="time" required className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="departureDate">Date of Departure</label>
              <input id="departureDate" name="departureDate" type="date" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="departureTime">Time of Departure</label>
              <input id="departureTime" name="departureTime" type="time" required className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="vehicleNumber">Vehicle Number (optional)</label>
            <input id="vehicleNumber" name="vehicleNumber" type="text" className={inputClass} />
          </div>
        </fieldset>

        <fieldset data-step={2} hidden={step !== 2} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="passportNumber">Passport Number</label>
            <input id="passportNumber" name="passportNumber" type="text" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="passportExpiryDate">Passport Expiry Date</label>
            <input id="passportExpiryDate" name="passportExpiryDate" type="date" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="visaType">Visa Type</label>
            <select id="visaType" name="visaType" required defaultValue="" className={inputClass}>
              <option value="" disabled>Select visa type</option>
              <option value="tourist">Tourist</option>
              <option value="business">Business</option>
              <option value="medical">Medical</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="visaNumber">Visa Number</label>
            <input id="visaNumber" name="visaNumber" type="text" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="visaExpiryDate">Visa Expiry Date</label>
            <input id="visaExpiryDate" name="visaExpiryDate" type="date" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="portOfEntry">Port of Entry into India</label>
            <input id="portOfEntry" name="portOfEntry" type="text" required placeholder="e.g. Delhi Airport" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="dateOfArrivalInIndia">Date of Arrival in India</label>
            <input id="dateOfArrivalInIndia" name="dateOfArrivalInIndia" type="date" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="froRegistrationNumber">FRO Registration Number (optional)</label>
            <input id="froRegistrationNumber" name="froRegistrationNumber" type="text" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="passportFile">Upload Passport (photo page)</label>
            <input
              id="passportFile"
              name="passportFile"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-saffron file:px-3 file:py-2 file:text-white`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="visaFile">Upload Visa</label>
            <input
              id="visaFile"
              name="visaFile"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-saffron file:px-3 file:py-2 file:text-white`}
            />
          </div>
        </fieldset>

        <fieldset data-step={3} hidden={step !== 3} className="space-y-4">
          <p className="text-sm text-walnut/70">
            Add anyone else staying in the room with you (optional).
          </p>
          {guests.map((guest, index) => (
            <div key={index} className="space-y-3 rounded-xl border border-walnut/15 bg-cream p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-walnut">Guest {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeGuestRow(index)}
                  className="text-sm font-medium text-maroon"
                >
                  Remove
                </button>
              </div>
              <div>
                <label className={labelClass}>Full Name</label>
                <input
                  type="text"
                  required
                  value={guest.fullName}
                  onChange={(e) => updateGuestRow(index, "fullName", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Age</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={120}
                    value={guest.age}
                    onChange={(e) => updateGuestRow(index, "age", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Sex</label>
                  <select
                    required
                    value={guest.sex}
                    onChange={(e) => updateGuestRow(index, "sex", e.target.value)}
                    className={inputClass}
                  >
                    <option value="" disabled>Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Address (optional)</label>
                <input
                  type="text"
                  value={guest.address}
                  onChange={(e) => updateGuestRow(index, "address", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Passport Number (optional)</label>
                <input
                  type="text"
                  value={guest.passportNumber}
                  onChange={(e) => updateGuestRow(index, "passportNumber", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addGuestRow}
            className="w-full rounded-xl border border-dashed border-saffron py-3 text-sm font-semibold text-saffron-dark"
          >
            + Add Guest
          </button>
        </fieldset>

        <fieldset data-step={4} hidden={step !== 4} className="space-y-4">
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

        {state.error && (
          <p role="alert" className="mt-4 rounded-lg bg-maroon/10 px-4 py-2.5 text-sm text-maroon">
            {state.error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="flex-1 rounded-xl border border-walnut/20 bg-white py-3.5 text-base font-semibold text-walnut"
            >
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
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
              {pending ? "Submitting..." : "Complete Registration"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
