"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Session-aware links rendered in the browser, so public pages stay static and cacheable.
export function AuthLinks() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setLoggedIn(!!session));
    return () => data.subscription.unsubscribe();
  }, []);

  if (loggedIn === null) return <span className="w-12" aria-hidden />;
  if (!loggedIn) return <Link href="/accedi" className="hover:text-primary">Accedi</Link>;
  return (
    <>
      <Link href="/dashboard" className="hover:text-primary">Area diving</Link>
      <form action="/esci" method="post">
        <button type="submit" className="hover:text-primary">Esci</button>
      </form>
    </>
  );
}
