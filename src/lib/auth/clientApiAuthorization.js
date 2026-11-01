import { supabase } from '@/supabase/util/supabase';

export async function clientApiAuthorization() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}
