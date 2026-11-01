// Documentation only. This file is never used by the API route handlers.
const string = (description) => ({ type: 'string', description });
const object = (properties, required = []) => ({ type: 'object', properties, ...(required.length ? { required } : {}) });
const json = (schema) => ({ content: { 'application/json': { schema } } });
const error = json(object({ error: string('Error message') }));
const bearer = [{ supabaseBearer: [] }];

function operation(summary, description, options = {}) {
  const {
    tag = 'Next.js API', auth = false, body, required = [], parameters = [],
    success = object({ success: { type: 'boolean' } }), successStatus = '200',
    errors = ['400', '500'], contentType = 'application/json',
  } = options;
  return {
    tags: [tag], summary, description, ...(auth ? { security: bearer } : {}),
    ...(parameters.length ? { parameters } : {}),
    ...(body ? { requestBody: { required: true, content: { [contentType]: { schema: object(body, required) } } } } : {}),
    responses: {
      [successStatus]: { description: 'Successful response', ...(success ? json(success) : {}) },
      ...Object.fromEntries(errors.map(code => [code, { description: `HTTP ${code} response`, ...error }])),
    },
  };
}

const query = (name, description, schema = { type: 'string' }) => ({ name, in: 'query', description, schema });
const nationalAdminNote = 'Requires a valid Supabase bearer token for a National Admin. The route verifies the caller before using its server-side service-role client.';
const provincialAdminNote = 'Requires a valid Supabase bearer token for a Provincial Admin.';
const noAuthNote = 'No caller authentication check is implemented in this route.';
const str = { type: 'string' };
const bool = { type: 'boolean' };
const num = { type: 'number' };

export const floodwatchOpenApi = {
  openapi: '3.1.0',
  info: {
    title: 'FloodWatch Cebu Next.js API',
    version: '1.0.0',
    description: 'Read-only reference derived from the existing src/app/api route handlers. This spec describes observed route behavior; it does not add authentication or change any endpoint. Swagger request execution is disabled.',
  },
  servers: [{ url: '/', description: 'This FloodWatch deployment' }],
  tags: [
    { name: 'Monitoring' }, { name: 'Reports' }, { name: 'Verification' },
    { name: 'Lantaw' }, { name: 'Administration' }, { name: 'Next.js API' },
  ],
  components: { securitySchemes: { supabaseBearer: { type: 'http', scheme: 'bearer', bearerFormat: 'Supabase access token', description: 'Supabase user access token. The route still applies its own role and ownership checks.' } } },
  paths: {
    '/api/cyclone': { get: operation('Get cyclone monitoring', `${noAuthNote} Returns cyclone monitoring and PAR status from weather sources.`, { tag: 'Monitoring', errors: [] }) },
    '/api/earthquake': { get: operation('Get earthquake monitoring', `${noAuthNote} Returns recent earthquakes near Cebu from USGS data and cache.`, { tag: 'Monitoring', errors: [] }) },
    '/api/hazard-telemetry': { get: operation('Get hazard telemetry', `${noAuthNote} Returns weather readings for Cebu monitoring stations.`, { tag: 'Monitoring', errors: ['500'] }) },
    '/api/health-check': { get: operation('Check AI service', `${nationalAdminNote} Pings the configured AI provider and records the result.`, { tag: 'Monitoring', auth: true, success: object({ status: str, message: str }), errors: ['401', '403', '500'] }) },
    '/api/monitoring/air': { get: operation('Get municipality air quality', `${noAuthNote} Returns selected municipality air quality and weather readings.`, { tag: 'Monitoring', success: object({ success: bool, source: str, count: { type: 'integer' }, data: { type: 'array', items: { type: 'object' } } }), errors: ['503'] }) },
    '/api/monitoring/telemetry': { get: operation('Get merged monitoring telemetry', `${noAuthNote} Returns municipality weather and air quality readings; may use cached data.`, { tag: 'Monitoring', parameters: [query('fresh', 'Set to true to bypass the in-memory cache.', { type: 'string', enum: ['true', 'false'] })], success: object({ success: bool, source: str, count: { type: 'integer' }, data: { type: 'array', items: { type: 'object' } } }), errors: ['500'] }) },
    '/api/seed-boundaries': { get: operation('Boundary seeding disabled', 'Requires National Admin authentication, then returns 410. This route no longer performs database writes.', { tag: 'Administration', auth: true, success: null, errors: ['401', '403', '410'] }) },
    '/api/situational-reports': {
      get: operation('List linkable situational reports', 'Requires a Supabase bearer token for an LGU headmaster or frontliner with a municipality. Lists verified root reports for that municipality.', { tag: 'Reports', auth: true, success: object({ reports: { type: 'array', items: { type: 'object' } } }), errors: ['400', '401', '403', '500'] }),
      post: operation('Create linked situational update', 'Requires a Supabase bearer token for an LGU headmaster or frontliner with a municipality. The parent must be an accepted situational report in the same municipality.', { tag: 'Reports', auth: true, body: { parent_report_id: str, description: str, image_url: str }, required: ['parent_report_id', 'description', 'image_url'], successStatus: '201', success: object({ report: { type: 'object' } }), errors: ['400', '401', '403', '404', '409', '500'] }),
    },
    '/api/situational-reports/acknowledge': { post: operation('Verify a linked report update', 'Requires a Supabase bearer token for a provincial admin. The report must belong to that admin’s province and be a pending linked update.', { tag: 'Reports', auth: true, body: { report_id: str }, required: ['report_id'], success: object({ report: { type: 'object' } }), errors: ['400', '401', '403', '404', '409', '500', '503'] }) },
    '/api/verification/decision': { post: operation('Decide an ID verification', 'Requires a Supabase bearer token. The Supabase RPC or fallback enforces national admin access and review state.', { tag: 'Verification', auth: true, body: { id_verification_id: str, decision: { type: 'string', enum: ['approved', 'rejected'] } }, required: ['id_verification_id', 'decision'], success: object({ verification: { type: 'object' } }), errors: ['400', '401', '403', '404', '409', '500'] }) },
    '/api/invitations/cleanup-stale': { post: operation('Remove a stale accepted invitation', 'Requires a Supabase bearer token for a national admin. Deletes an accepted invitation only when no matching auth account remains.', { tag: 'Administration', auth: true, body: { email: str }, required: ['email'], success: object({ removed: bool }), errors: ['400', '401', '403', '500'] }) },
    '/api/seeding/sync-psa-census': { post: operation('Sync PSA census statistics', 'Requires a Supabase bearer token for a national admin. Reuses recent cached statistics or refreshes the municipality census cache.', { tag: 'Administration', auth: true, success: object({ refreshed: bool, matched: { type: 'integer' }, unmatched: { type: 'array', items: { type: 'object' } }, unverified: { type: 'array', items: { type: 'object' } }, lastSyncedAt: str }), errors: ['401', '403', '503'] }) },
    '/api/seeding/add-area': { post: operation('Add a municipality or city', `${nationalAdminNote} Creates a municipality and optionally a province. Coordinates accept values parseable as numbers.`, { tag: 'Administration', auth: true, body: { province_id: str, new_province_name: str, is_new_province: bool, name: str, latitude: num, longitude: num, center_point: str, boundary_geofence: str }, required: ['name', 'latitude', 'longitude'], success: object({ success: bool, message: str, data: { type: 'object' } }), errors: ['400', '401', '403', '500'] }) },
    '/api/seeding/update-area': { post: operation('Update a municipality or city', `${nationalAdminNote} Updates coordinates, optional name and optional WKT geofence.`, { tag: 'Administration', auth: true, body: { municipality_id: str, name: str, latitude: num, longitude: num, center_point: str, boundary_geofence: str }, required: ['municipality_id', 'latitude', 'longitude'], success: object({ success: bool, message: str, data: { type: 'array', items: { type: 'object' } } }), errors: ['400', '401', '403', '500'] }) },
    '/api/seeding/delete-area': { post: operation('Delete a municipality or province', `${nationalAdminNote} Deletes a municipality and its telemetry, or a province.`, { tag: 'Administration', auth: true, body: { municipality_id: str, province_id: str }, success: object({ success: bool, message: str }), errors: ['400', '401', '403', '500'] }) },
    '/api/users/delete': { post: operation('Permanently delete an account', `${nationalAdminNote} Deletes the user profile, related records and auth account.`, { tag: 'Administration', auth: true, body: { userId: str }, required: ['userId'], success: object({ success: bool, message: str }), errors: ['400', '401', '403', '500'] }) },
    '/api/users/update-status': { post: operation('Update account status', `${nationalAdminNote} Normalizes status to active or deactivate before updating a user profile.`, { tag: 'Administration', auth: true, body: { userId: str, status: str }, required: ['userId', 'status'], success: object({ success: bool, message: str, data: { type: 'array', items: { type: 'object' } } }), errors: ['400', '401', '403', '500'] }) },
    '/api/send-invite-email': { post: operation('Send an invitation email', `${nationalAdminNote} Looks up a pending invitation by code and sends it to its stored recipient using the server’s Resend configuration.`, { tag: 'Administration', auth: true, body: { inviteCode: str }, required: ['inviteCode'], success: object({ success: bool, data: { type: 'object' } }), errors: ['400', '401', '403', '500'] }) },
    '/api/logs/track': { post: operation('Track client telemetry', 'Accepts only mapbox Execution, mapbox Map Error, and weather Execution events. Caller-supplied messages and status values are ignored; these events do not update authoritative API monitoring status.', { body: { apiType: { type: 'string', enum: ['mapbox', 'weather'] }, eventType: { type: 'string', enum: ['Execution', 'Map Error'] } }, success: object({ success: bool }), errors: ['400', '413', '500'] }) },
    '/api/lantaw': { post: operation('Ask Lantaw', `${provincialAdminNote} Data context is limited to the admin’s assigned province; categories without a verified province link are unavailable. Conversation ownership uses the verified user ID. With Accept: application/x-ndjson, returns streamed newline-delimited JSON events; otherwise returns JSON.`, { tag: 'Lantaw', auth: true, parameters: [{ name: 'Accept', in: 'header', description: 'Use application/x-ndjson for streamed events.', schema: { type: 'string', enum: ['application/json', 'application/x-ndjson'] } }], body: { prompt: str, conversationId: str, history: { type: 'array', items: { type: 'object' } } }, required: ['prompt'], success: object({ response: str, source: str, latency_ms: num }), errors: ['400', '401', '403', '503'] }) },
    '/api/lantaw/document': { post: operation('Generate a Lantaw document', `${provincialAdminNote} Generates a PDF or DOCX attachment.`, { tag: 'Lantaw', auth: true, body: { title: str, content: str, format: { type: 'string', enum: ['pdf', 'docx'], default: 'pdf' } }, required: ['title', 'content'], success: null, errors: ['400', '401', '403', '500'] }) },
    '/api/lantaw/extract': { post: operation('Extract data from an uploaded file', `${provincialAdminNote} Accepts a file up to 10 MB (.xlsx, .xls, .csv, .pdf, .docx, .txt, .png, .jpg, .jpeg or .webp).`, { tag: 'Lantaw', auth: true, contentType: 'multipart/form-data', body: { file: { type: 'string', format: 'binary' }, target_table: str }, required: ['file'], success: object({ data: { type: 'object' } }), errors: ['400', '401', '403', '500'] }) },
    '/api/lantaw/news-assist': { post: operation('Draft news fields', `${provincialAdminNote} Drafts missing news fields from narration with the configured AI provider.`, { tag: 'Lantaw', auth: true, body: { narration: str, existingFields: { type: 'object' } }, required: ['narration'], success: object({ fields: { type: 'object' } }), errors: ['400', '401', '403', '503'] }) },
    '/api/lantaw/prioritize-requests': { post: operation('Analyze resource requests', 'Requires a Supabase bearer token for a national or provincial admin. Provincial Admin results are limited to their assigned province.', { tag: 'Lantaw', auth: true, success: object({ success: bool, data: { type: 'object' } }), errors: ['401', '403', '500', '503'] }) },
    '/api/lantaw/sheet': { post: operation('Export a Lantaw spreadsheet', `${provincialAdminNote} Municipality-linked sources are limited to the admin’s province; inventory sources are shared across provinces. Returns an XLSX attachment.`, { tag: 'Lantaw', auth: true, body: { source: { type: 'string', enum: ['pdrrmo_inventory', 'weather_telemetry', 'incident_report', 'air_quality', 'distress_signals', 'utilities'] }, title: str }, required: ['source'], success: null, errors: ['400', '401', '403', '404', '500'] }) },
    '/api/lantaw/verify': { post: operation('Analyze an ID submission', 'Requires a Supabase bearer token. The caller must own the submission or have the national admin role.', { tag: 'Verification', auth: true, body: { id_verification_id: str }, required: ['id_verification_id'], success: { type: 'object', description: 'AI verification assessment and saved result.' }, errors: ['401', '403', '422', '500', '503'] }) },
  },
};
