import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  return { session, loading: session === undefined };
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error;
}

export async function signOut() {
  await supabase.auth.signOut();
}
