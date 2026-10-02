import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.NEXT_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Known static UUIDs as fallback from api_monitoring table
const KNOWN_API_IDS = {
  lantaw: '4ac8efb6-5922-4be0-a1a7-8eff5887845f',
  mapbox: 'c92fd732-eb13-4a16-ae1a-58df02a061fa',
  weather: '9c8a3010-a692-4728-a96e-bcf372e11933',
  sms: '4e6b818b-2bc2-4d12-81ba-4020489d39db'
};

const cachedApiIds = {};

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

export async function getApiId(apiType = 'lantaw') {
  const normalized = (apiType || 'lantaw').toLowerCase();
  let key = 'lantaw';
  if (normalized.includes('map')) key = 'mapbox';
  else if (normalized.includes('weather')) key = 'weather';
  else if (normalized.includes('sms') || normalized.includes('semaphore')) key = 'sms';

  if (cachedApiIds[key]) return cachedApiIds[key];

  try {
    const supabase = getSupabase();
    if (supabase) {
      let searchPattern = '%lantaw%';
      if (key === 'mapbox') searchPattern = '%map%';
      else if (key === 'weather') searchPattern = '%weather%';
      else if (key === 'sms') searchPattern = '%sms%';

      const { data } = await supabase
        .from('api_monitoring')
        .select('api_id')
        .ilike('api_name', searchPattern)
        .maybeSingle();

      if (data?.api_id) {
        cachedApiIds[key] = data.api_id;
        return cachedApiIds[key];
      }
    }
  } catch (err) {
    console.error(`Error resolving API ID for ${key}:`, err);
  }

  return KNOWN_API_IDS[key] || KNOWN_API_IDS.lantaw;
}

/**
 * Universal logger function that records an entry into api_activity_logs
 * and updates the corresponding api_monitoring record.
 */
export async function logApiActivity({
  apiType = 'lantaw',
  eventType = 'Execution',
  message = '',
  isError = false,
  status = null,
  errorMessage = null
}) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;

    const apiId = await getApiId(apiType);
    const now = new Date().toISOString();
    const safeMessage = String(message || '').slice(0, 1000);

    // 1. Insert history log entry
    await supabase.from('api_activity_logs').insert({
      api_id: apiId,
      event_type: eventType,
      message: safeMessage,
      created_at: now
    });

    // 2. Determine api_monitoring updates
    const resolvedStatus = status || (isError ? 'Error' : 'Active');
    const updatePayload = {
      api_status: resolvedStatus,
      last_call_at: now,
      error_message: isError ? (errorMessage || safeMessage).slice(0, 500) : null
    };

    await supabase.from('api_monitoring').update(updatePayload).eq('api_id', apiId);
  } catch (logErr) {
    console.error("Failed to log API activity:", logErr);
  }
}

/**
 * Automatically records an AI error into the API Activity Logs history
 * and updates the API Monitoring status.
 */
export async function logAiError(service, error, context = null) {
  const rawMessage = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
  const fullMessage = context 
    ? `[${service}] ${rawMessage} (Context: ${typeof context === 'object' ? JSON.stringify(context) : context})`
    : `[${service}] ${rawMessage}`;

  return logApiActivity({
    apiType: 'lantaw',
    eventType: 'AI Error',
    message: fullMessage,
    isError: true,
    errorMessage: rawMessage
  });
}

/**
 * Automatically records an AI success/execution event and marks API active.
 */
export async function logAiSuccess(service, message = "Executed successfully") {
  const fullMessage = `[${service}] ${message}`;
  return logApiActivity({
    apiType: 'lantaw',
    eventType: 'Execution',
    message: fullMessage,
    isError: false,
    status: 'Active'
  });
}

/**
 * Automatically records Mapbox map load / geocoding execution
 */
export async function logMapboxSuccess(message = "Map loaded successfully") {
  const fullMessage = message.startsWith('[') ? message : `[Mapbox GL] ${message}`;
  return logApiActivity({
    apiType: 'mapbox',
    eventType: 'Execution',
    message: fullMessage,
    isError: false,
    status: 'Active'
  });
}

/**
 * Automatically records Mapbox error
 */
export async function logMapboxError(error, context = null) {
  const rawMessage = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
  const fullMessage = context 
    ? `[Mapbox GL] ${rawMessage} (${context})` 
    : `[Mapbox GL] ${rawMessage}`;

  return logApiActivity({
    apiType: 'mapbox',
    eventType: 'Map Error',
    message: fullMessage,
    isError: true,
    errorMessage: rawMessage
  });
}

/**
 * Automatically records OpenWeather telemetry fetch
 */
export async function logWeatherSuccess(message = "Realtime weather data fetched") {
  const fullMessage = message.startsWith('[') ? message : `[OpenWeather API] ${message}`;
  return logApiActivity({
    apiType: 'weather',
    eventType: 'Execution',
    message: fullMessage,
    isError: false,
    status: 'Active'
  });
}

/**
 * Automatically records OpenWeather error
 */
export async function logWeatherError(error, context = null) {
  const rawMessage = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
  const fullMessage = context 
    ? `[OpenWeather API] ${rawMessage} (${context})` 
    : `[OpenWeather API] ${rawMessage}`;

  return logApiActivity({
    apiType: 'weather',
    eventType: 'Weather Error',
    message: fullMessage,
    isError: true,
    errorMessage: rawMessage
  });
}
