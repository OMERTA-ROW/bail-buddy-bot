import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-header";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Postbail — the second a bond is set, we tell you" },
      { name: "description", content: "Track loved ones through county jail intake. Instant SMS alerts when a bond is posted. Licensed bail agents ready to post 24/7." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* Hero */}
      <section className="container-page pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="max-w-3xl">
          <p className="eyebrow mb-6">Jail intake · Bond tracking · Referrals</p>
          <h1 className="text-5xl leading-[1.02] tracking-tight md:text-7xl">
            The second a bond is <em className="italic text-accent">set</em>, we tell you.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Someone you love just got booked. You don't know the charges, the bond, or whether they'll spend the night in a cell. Postbail watches the roster, sends you the moment a bond posts, and connects you with a licensed bondsman in that county — in minutes, not mornings.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Start tracking someone →
            </Link>
            <Link
              to="/bondsmen"
              className="rounded-md border border-input px-6 py-3 text-sm font-medium hover:bg-secondary"
            >
              Find a licensed bondsman
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Free to track. You only pay a bondsman's standard premium (typically 10%) if you use one.
          </p>
        </div>
      </section>

      {/* Live signal panel */}
      <section className="border-y border-border/60 bg-card">
        <div className="container-page grid gap-10 py-12 md:grid-cols-3">
          {[
            { k: "AVG. TIME TO ALERT", v: "4 min", note: "From bond post to your phone" },
            { k: "JAILS COVERED", v: "3,000+", note: "Via VINELink + county rosters" },
            { k: "LICENSED AGENTS", v: "24/7", note: "Verified state licenses" },
          ].map((s) => (
            <div key={s.k}>
              <p className="eyebrow">{s.k}</p>
              <p className="mt-2 font-serif text-5xl tracking-tight">{s.v}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-24">
        <div className="mb-14 max-w-2xl">
          <p className="eyebrow mb-4">How it works</p>
          <h2 className="text-4xl md:text-5xl">Three steps between the arrest and the front door.</h2>
        </div>
        <ol className="grid gap-8 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "Add the person",
              d: "Name, date of birth, county. Takes ninety seconds. We start watching the jail roster immediately.",
            },
            {
              n: "02",
              t: "Get the alert",
              d: "SMS and email the instant status changes: booked, bond set, hearing scheduled, bond posted, released.",
            },
            {
              n: "03",
              t: "Connect the bondsman",
              d: "One tap forwards the case to a verified bail agent in that county. They post. Your person walks.",
            },
          ].map((s) => (
            <li key={s.n} className="border-t border-foreground pt-5">
              <p className="font-serif text-sm text-accent">{s.n}</p>
              <h3 className="mt-2 text-2xl">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Honesty block */}
      <section className="bg-primary text-primary-foreground">
        <div className="container-page grid gap-12 py-20 md:grid-cols-5">
          <div className="md:col-span-2">
            <p className="eyebrow text-primary-foreground/60">What we are, plainly</p>
            <h2 className="mt-3 text-4xl">We don't post bail. Licensed agents do. We just make sure it happens fast.</h2>
          </div>
          <div className="space-y-6 text-primary-foreground/80 md:col-span-3">
            <p>
              Posting bond as a business requires a state-issued bail agent license. Postbail is not that — we're the tracking and referral layer that sits above every county jail in the country and turns hours of refresh-the-page waiting into a single push notification.
            </p>
            <p>
              When you're ready to post, one tap sends the case to a verified bondsman licensed in that specific county. They handle the paperwork, the collateral, and the trip to the jail. You handle being there when they walk out.
            </p>
            <p className="text-primary-foreground/60 text-sm">
              Commercial bail is banned in Illinois, Kentucky, Oregon, and Wisconsin. In those states we track status only.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-24 text-center">
        <h2 className="mx-auto max-w-2xl text-4xl md:text-5xl">
          You don't need a plan for tomorrow. You need to know <em className="italic text-accent">tonight</em>.
        </h2>
        <div className="mt-8">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Start tracking — it's free
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
