import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.NEXT_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cachedLantawApiId = null;

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function getLantawApiId(supabase) {
  if (cachedLantawApiId) return cachedLantawApiId;

  try {
    const { data } = await supabase
      .from('api_monitoring')
      .select('api_id')
      .ilike('api_name', '%lantaw%')
      .maybeSingle();

    if (data?.api_id) {
      cachedLantawApiId = data.api_id;
      return cachedLantawApiId;
    }
  } catch (err) {
    console.error("Error looking up Lantaw API id:", err);
  }

  // Fallback to known UUID from api_monitoring table
  return '4ac8efb6-5922-4be0-a1a7-8eff5887845f';
}

/**
 * Automatically records an AI error into the API Activity Logs history
 * and updates the API Monitoring status.
 *
 * @param {string} service - e.g. "Lantaw Chatbot", "Lantaw News Assist", "Lantaw Extract"
 * @param {string} error - The error message or object
 * @param {object|null} context - Optional context (model used, userId, etc.)
 */
export async function logAiError(service, error, context = null) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;

    const apiId = await getLantawApiId(supabase);
    const now = new Date().toISOString();

    const rawMessage = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
    const fullMessage = context 
      ? `[${service}] ${rawMessage} (Context: ${typeof context === 'object' ? JSON.stringify(context) : context})`
      : `[${service}] ${rawMessage}`;

    const safeMessage = fullMessage.slice(0, 1000);

    // 1. Insert history log entry into api_activity_logs
    await supabase.from('api_activity_logs').insert({
      api_id: apiId,
      event_type: 'AI Error',
      message: safeMessage,
      created_at: now
    });

    // 2. Update status in api_monitoring
    await supabase.from('api_monitoring').update({
      api_status: 'Error',
      last_call_at: now,
      error_message: rawMessage.slice(0, 500)
    }).eq('api_id', apiId);

  } catch (logErr) {
    console.error("Failed to write to api_activity_logs:", logErr);
  }
}

/**
 * Automatically records an AI success/execution event and marks API active.
 *
 * @param {string} service - e.g. "Lantaw Chatbot", "Lantaw News Assist", "Lantaw Extract"
 * @param {string} message - Success details
 */
export async function logAiSuccess(service, message = "Executed successfully") {
  try {
    const supabase = getSupabase();
    if (!supabase) return;

    const apiId = await getLantawApiId(supabase);
    const now = new Date().toISOString();

    const fullMessage = `[${service}] ${message}`;

    // 1. Insert execution history log
    await supabase.from('api_activity_logs').insert({
      api_id: apiId,
      event_type: 'Execution',
      message: fullMessage.slice(0, 1000),
      created_at: now
    });

    // 2. Set API status back to Active
    await supabase.from('api_monitoring').update({
      api_status: 'Active',
      last_call_at: now,
      error_message: null
    }).eq('api_id', apiId);

  } catch (logErr) {
    console.error("Failed to update api_monitoring status:", logErr);
  }
}
