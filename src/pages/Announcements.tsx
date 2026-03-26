import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, Bell, CalendarDays, CheckCircle2, Mail, Radio, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const announcementGroups = [
  {
    eyebrow: "Product",
    title: "Smarter trip planning with Merry",
    summary: "The assistant now routes guests from discovery to cart and checkout more cleanly, with faster help states and clearer follow-up actions.",
    meta: "March 2026",
  },
  {
    eyebrow: "Platform",
    title: "Host and admin earnings reporting tuned",
    summary: "Financial dashboard totals now align with confirmed paid bookings, and admin host earnings follow the same paid-total model.",
    meta: "Operations update",
  },
  {
    eyebrow: "Community",
    title: "Local stories and insider drops",
    summary: "We are packaging destination stories, launch notes, and release updates into one lightweight feed instead of scattering them across the homepage.",
    meta: "Weekly digest",
  },
] as const;

const releaseNotes = [
  {
    label: "Merry assistant refresh",
    detail: "Cleaner support launcher, centered assistant panel, and a branded white avatar treatment.",
  },
  {
    label: "Finance reporting corrections",
    detail: "Paid and pending booking counts now use consistent payment-state logic across dashboards.",
  },
  {
    label: "Admin analytics recovery",
    detail: "AI usage reporting functions were repaired at the database layer so live dashboard summaries can update again.",
  },
] as const;

export default function Announcements() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  const totalNotes = useMemo(() => announcementGroups.length + releaseNotes.length, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setError(null);
    setSubscribed(true);
    setEmail("");
  };

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-foreground">
      <Navbar />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.08)]">
          <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1.35fr_0.95fr] lg:px-10 lg:py-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">
                <Bell className="h-3.5 w-3.5" />
                Announcements
              </div>

              <div className="space-y-3">
                <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  One place for platform updates, travel drops, and release notes.
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  This page replaces the scattered update prompts with a cleaner feed. Check product changes, launch notes, and guest-facing announcements here.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="border-slate-200 bg-slate-50/70 shadow-none">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Cadence</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">Weekly</p>
                    <p className="mt-1 text-xs text-slate-600">Tighter digest instead of noisy popups.</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-slate-50/70 shadow-none">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Coverage</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">Product + travel</p>
                    <p className="mt-1 text-xs text-slate-600">Releases, local stories, and destination offers.</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-slate-50/70 shadow-none">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Notes</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{totalNotes}</p>
                    <p className="mt-1 text-xs text-slate-600">Current items in the feed right now.</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Sparkles className="h-4 w-4 text-rose-500" />
                Travel Insider Updates
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Subscribe for release notes, limited drops, and local host stories before they hit broader channels.
              </p>

              <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-rose-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Newsletter</p>
                    <p className="text-xs text-slate-600">Product notes, curated stays, and destination highlights.</p>
                  </div>
                </div>

                {subscribed ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Thanks for subscribing.
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <label htmlFor="announcements-email" className="sr-only">Email address</label>
                    <input
                      id="announcements-email"
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="you@example.com"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-rose-400"
                      autoComplete="email"
                      required
                    />
                    {error ? <p className="text-xs text-destructive">{error}</p> : null}
                    <Button type="submit" className="h-11 w-full justify-between rounded-xl bg-rose-500 px-4 text-sm text-white hover:bg-rose-600">
                      <span>Join newsletter</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Radio className="h-4 w-4 text-rose-500" />
              Current Feed
            </div>
            <div className="space-y-4">
              {announcementGroups.map((item) => (
                <article key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                      {item.eyebrow}
                    </span>
                    <span className="text-xs text-slate-500">{item.meta}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-900">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              <CalendarDays className="h-4 w-4 text-rose-500" />
              Release Notes
            </div>
            <div className="space-y-3">
              {releaseNotes.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
