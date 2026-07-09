import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Highway Heaven | Kashmiri Homestay in Srinagar",
  description:
    "A Kashmiri homestay experience like no other. Cozy mountain stays on Bemina Bypass, Srinagar.",
};

type Settings = {
  property_name: string;
  whatsapp_number: string;
  support_email: string;
};

type Plan = {
  code: string;
  name: string;
  description: string;
};

type HouseRule = {
  rule: string;
};

const FALLBACK_SETTINGS: Settings = {
  property_name: "Highway Heaven",
  whatsapp_number: "8082091213",
  support_email: "jkhighwayheaven@gmail.com",
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 12.5L9.5 17L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 21s7-7.1 7-12a7 7 0 10-14 0c0 4.9 7 12 7 12z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M5 19c0-5 3-8 8-9.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 11.5L12 4l8 7.5M6 10v9h12v-9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M7 4h3l1.5 4-2 1.5a11 11 0 005.5 5.5l1.5-2 4 1.5v3a2 2 0 01-2 2C11 19.5 4.5 13 4.5 6a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 7l7.5 6 7.5-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.94.57 3.74 1.55 5.25L2 22l4.99-1.63a9.8 9.8 0 005.05 1.39h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.13-2.9-7C17.18 3.03 14.69 2 12.04 2zm0 18.07h-.01a8.16 8.16 0 01-4.16-1.14l-.3-.18-3.08 1 1.02-3-.2-.31a8.13 8.13 0 01-1.25-4.33c0-4.5 3.66-8.16 8.17-8.16 2.18 0 4.23.85 5.77 2.39a8.1 8.1 0 012.4 5.78c0 4.5-3.67 8.16-8.16 8.16zm4.48-6.12c-.25-.12-1.45-.71-1.67-.8-.22-.08-.38-.12-.55.12-.16.25-.62.8-.76.96-.14.16-.28.18-.52.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.22-1.45-1.37-1.7-.14-.24-.02-.37.11-.5.12-.12.27-.31.4-.46.13-.16.18-.27.27-.45.08-.18.04-.33-.04-.46-.08-.12-.5-1.2-.68-1.65-.18-.43-.36-.37-.5-.38h-.43c-.14 0-.37.05-.57.27-.2.22-.76.74-.76 1.81 0 1.07.78 2.1.89 2.25.11.14 1.51 2.3 3.67 3.13 1.82.7 2.19.56 2.59.52.4-.04 1.29-.53 1.47-1.04.18-.5.18-.93.13-1.02-.05-.1-.2-.16-.45-.28z" />
    </svg>
  );
}

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: settingsRow }, { data: plans }, { data: rules }] = await Promise.all([
    supabase
      .from("settings")
      .select("property_name, whatsapp_number, support_email")
      .maybeSingle(),
    supabase
      .from("plans")
      .select("code, name, description")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("house_rules")
      .select("rule")
      .order("sort_order", { ascending: true })
      .limit(3),
  ]);

  const settings: Settings = settingsRow ?? FALLBACK_SETTINGS;
  const activePlans: Plan[] = plans ?? [];
  const previewRules: HouseRule[] = rules ?? [];

  const contactDigits = digitsOnly(settings.whatsapp_number);
  const whatsappHref = `https://wa.me/91${contactDigits}`;
  const phoneHref = `tel:+91${contactDigits}`;
  const mailHref = `mailto:${settings.support_email}`;

  return (
    <div className="flex flex-1 flex-col bg-cream text-walnut">
      <header className="sticky top-0 z-20 border-b border-saffron/15 bg-cream/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="font-serif text-lg font-semibold tracking-wide text-walnut">
            {settings.property_name}
          </span>
          <span className="hidden text-xs uppercase tracking-[0.2em] text-saffron-dark sm:inline">
            Bemina Bypass · Srinagar
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="relative isolate flex min-h-[88vh] flex-col items-center justify-center overflow-hidden bg-linear-to-b from-maroon via-walnut to-walnut px-6 py-28 text-center text-cream sm:min-h-screen">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle_at_1px_1px,var(--color-cream)_1px,transparent_0)] [background-size:26px_26px]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -top-32 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-saffron/25 blur-3xl"
            aria-hidden="true"
          />

          <p className="relative z-10 text-xs uppercase tracking-[0.35em] text-saffron">
            Jammu &amp; Kashmir
          </p>
          <h1 className="relative z-10 mt-5 font-serif text-5xl font-semibold tracking-tight sm:text-6xl md:text-7xl">
            {settings.property_name}
          </h1>
          <p className="relative z-10 mt-6 max-w-xl text-balance text-lg text-cream/85 sm:text-xl">
            A Kashmiri homestay experience like no other.
          </p>
          <p className="relative z-10 mt-2 text-sm text-cream/60">
            Arrive by invitation — scan the QR code at your room to begin.
          </p>

          <svg
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            className="absolute inset-x-0 bottom-0 h-16 w-full text-cream sm:h-24"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M0,96 L120,72 L240,96 L360,48 L480,88 L600,40 L720,80 L840,32 L960,84 L1080,56 L1200,92 L1320,60 L1440,90 L1440,120 L0,120 Z"
            />
          </svg>
        </section>

        {/* About */}
        <section id="about" className="bg-cream px-6 py-20 sm:py-24">
          <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-saffron-dark">
                About Us
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-walnut sm:text-4xl">
                A cozy mountain homestay
              </h2>
              <p className="mt-5 text-walnut/80 leading-relaxed">
                Tucked along Bemina Bypass in Srinagar, Highway Heaven is a small
                family-run homestay built for travellers who want Kashmir&apos;s
                warmth without the noise of a hotel. Walnut-wood interiors, soft
                Kashmiri textiles, and home-cooked meals greet every guest who
                walks through our doors.
              </p>
              <p className="mt-4 text-walnut/80 leading-relaxed">
                We keep things personal — a handful of rooms, attentive hosts,
                and the kind of quiet mountain mornings that make a stay feel
                like a story worth telling.
              </p>
            </div>

            <div className="rounded-3xl border border-saffron/20 bg-white/60 p-8 shadow-sm">
              <ul className="space-y-5">
                <li className="flex items-start gap-4">
                  <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-saffron-dark" />
                  <span className="text-walnut/80">
                    Located on Bemina Bypass, Srinagar — easy to find, peaceful
                    to stay.
                  </span>
                </li>
                <li className="flex items-start gap-4">
                  <HomeIcon className="mt-0.5 h-5 w-5 shrink-0 text-saffron-dark" />
                  <span className="text-walnut/80">
                    A handful of intimate rooms, never crowded, always
                    personal.
                  </span>
                </li>
                <li className="flex items-start gap-4">
                  <LeafIcon className="mt-0.5 h-5 w-5 shrink-0 text-saffron-dark" />
                  <span className="text-walnut/80">
                    Home-style Kashmiri hospitality, from kahwa on arrival to
                    quiet evenings in.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Our Plans */}
        <section id="plans" className="bg-white px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-saffron-dark">
                Stay With Us
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-walnut sm:text-4xl">
                Our Plans
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-walnut/70">
                Choose the plan that suits your appetite — tariffs are shared
                with you directly at the time of booking.
              </p>
            </div>

            {activePlans.length > 0 ? (
              <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {activePlans.map((plan) => (
                  <div
                    key={plan.code}
                    className="rounded-2xl border border-saffron/20 bg-cream p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-maroon font-serif text-sm font-semibold text-cream">
                      {plan.code}
                    </div>
                    <h3 className="mt-4 font-serif text-lg font-semibold text-walnut">
                      {plan.name}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-walnut/70">
                      {plan.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-12 text-center text-walnut/60">
                Plan details are being updated — please check back shortly.
              </p>
            )}
          </div>
        </section>

        {/* House Rules */}
        <section id="house-rules" className="bg-walnut px-6 py-20 text-cream sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-saffron">
              Good To Know
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold sm:text-4xl">
              House Rules
            </h2>

            {previewRules.length > 0 ? (
              <ul className="mt-8 space-y-4 text-left">
                {previewRules.map((rule, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-saffron" />
                    <span className="text-cream/85">{rule.rule}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-cream/75">
                Our house rules are simple and guest-friendly — full details
                are shared with you at check-in.
              </p>
            )}

            <p className="mt-8 text-sm italic text-cream/60">
              See all rules on check-in.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="bg-cream px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-saffron-dark">
              Reach Us
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-walnut sm:text-4xl">
              Get in Touch
            </h2>
            <p className="mx-auto mt-4 max-w-md text-walnut/70">
              We&apos;re reachable by call, WhatsApp, or email for any
              questions before your stay.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
              <a
                href={phoneHref}
                className="flex items-center gap-2 rounded-full border border-saffron/30 bg-white px-5 py-3 text-sm font-medium text-walnut shadow-sm transition hover:border-saffron"
              >
                <PhoneIcon className="h-4 w-4 text-saffron-dark" />
                +91 {settings.whatsapp_number}
              </a>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full border border-saffron/30 bg-white px-5 py-3 text-sm font-medium text-walnut shadow-sm transition hover:border-saffron"
              >
                <WhatsAppIcon className="h-4 w-4 text-saffron-dark" />
                WhatsApp Us
              </a>
              <a
                href={mailHref}
                className="flex items-center gap-2 rounded-full border border-saffron/30 bg-white px-5 py-3 text-sm font-medium text-walnut shadow-sm transition hover:border-saffron"
              >
                <MailIcon className="h-4 w-4 text-saffron-dark" />
                {settings.support_email}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-maroon px-6 py-10 text-center text-sm text-cream/70">
        <p className="font-serif text-base font-semibold text-cream">
          {settings.property_name}
        </p>
        <p className="mt-2">Bemina Bypass, Srinagar, Jammu &amp; Kashmir</p>
        <p className="mt-1">Registration No. JKPG00002993</p>
        <p className="mt-4 text-cream/50">
          &copy; {new Date().getFullYear()} {settings.property_name}. All
          rights reserved.
        </p>
      </footer>
    </div>
  );
}
