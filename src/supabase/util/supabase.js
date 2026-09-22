import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.NEXT_SERVICE_ROLE_KEY;

// This exports a single, reusable connection to your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey);