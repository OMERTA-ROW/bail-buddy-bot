import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export function SiteHeader() {
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-lg font-serif tracking-tight">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          Postbail
        </Link>
        <nav className="hidden items-center gap-8 text-sm md:flex">
          <Link to="/bondsmen" className="text-muted-foreground hover:text-foreground [&.active]:text-foreground">
            Bondsmen
          </Link>
          {session ? (
            <>
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground [&.active]:text-foreground">
                Dashboard
              </Link>
              <Link to="/card" className="text-muted-foreground hover:text-foreground [&.active]:text-foreground">
                My card
              </Link>
              <Link to="/cosigners" className="text-muted-foreground hover:text-foreground [&.active]:text-foreground">
                Cosigners
              </Link>
              <Link to="/documents" className="text-muted-foreground hover:text-foreground [&.active]:text-foreground">
                Documents
              </Link>
              <Link to="/account" className="text-muted-foreground hover:text-foreground [&.active]:text-foreground">
                Funding account
              </Link>
              <Link to="/payment-methods" className="text-muted-foreground hover:text-foreground [&.active]:text-foreground">
                Payment methods
              </Link>

            </>
          ) : null}
        </nav>
        <div className="flex items-center gap-2">
          {session ? (
            <>
              <Link
                to="/dashboard"
                className="hidden rounded-md border border-input px-3 py-1.5 text-sm hover:bg-secondary md:inline-flex"
              >
                Dashboard
              </Link>
              <button
                onClick={signOut}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" search={{ mode: "signin" }} className="rounded-md px-3 py-1.5 text-sm hover:bg-secondary">
                Sign in
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Start tracking
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 mt-24">
      <div className="container-page py-10 text-sm text-muted-foreground">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="font-serif text-base text-foreground">Postbail</p>
          <p className="max-w-xl">
            Postbail is a tracking and referral service. We are not a bail bond agency. All bonds are posted by state-licensed bail agents you connect with through the platform.
          </p>
        </div>
        <p className="mt-6 text-xs">© {new Date().getFullYear()} Postbail. All rights reserved.</p>
      </div>
    </footer>
  );
}
