import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns whether the Supabase auth session is ready and present.
 * Use this to gate `enabled` of queries that call server fns protected
 * by `requireSupabaseAuth`, so they don't fire (and 401) before the
 * bearer token is attached.
 */
export function useAuthReady() {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setHasSession(!!data.session);
      setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(!!session);
      setReady(true);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { ready, hasSession, isAuthed: ready && hasSession };
}