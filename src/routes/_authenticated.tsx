import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-header";

export const Route = createFileRoute("/_authenticated")({
  component: Layout,
});

function Layout() {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setReady(true);
      if (!data.session) {
        window.location.href = "/auth";
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setHasSession(!!s);
      if (!s) window.location.href = "/auth";
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container-page py-24 text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }
  if (!hasSession) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="container-page py-10">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
