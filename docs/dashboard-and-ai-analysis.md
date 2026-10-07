Dashboard and analytics behavior
--------------------------------
The provincial dashboard's LGU Emergency Requests card uses the existing
explicit High urgency markers in the reason text, including mobile drop-off
metadata and `Urgency: HIGH` tags, case-insensitively. Low and Medium urgency
are excluded. Pending, allocated, dispatched and received High urgency requests
remain active until Returned or Rejected. The card refreshes on inserts, updates
and deletes. Event bursts are debounced. A five-second automatic visible-tab
check, plus focus/reconnect checks, keeps data synced when realtime is unavailable;
there is no manual Refresh button. Request reads are paginated so low-urgency
records cannot push an older High request beyond a result limit.

National analytics always opens in the ready-to-analyze state. Realtime events
mark data as changed; they never call the AI endpoint. Analysis only runs after
the administrator clicks the button. Results remain in component memory only,
are cleared when the session changes, and are never restored from the former
shared localStorage cache. A request arriving during analysis leaves the refresh
notice visible so the administrator can analyze the latest data explicitly.

The endpoint checks the signed-in session's profile, permits national and
provincial admins, reads actual active
requests and their related supplies, and uses full request IDs in the analysis.
Role lookup failures return temporary verification errors rather than false
access-denied errors. It analyzes at most the latest 25 active requests per click; if more exist,
the results show the actual analyzed count and total active count. It skips the
provider entirely when the queue is empty. Missing database data is an error,
not a sample queue. Missing weather readings are unavailable, not invented rain.

Gemini requests have per-attempt timeouts and up to three attempts for transient
429/5xx or network failures, with exponential backoff and jitter. Persistent
failures return a recoverable HTTP 503 and restore the Analyze button. Concurrent
calls by one administrator share an in-flight analysis. There is no completed
result cache on the server. The in-flight map is local to a server process;
separate replicas do not share that guard.

Configuration continues to use `GEMINI_LANTAW_AI`, `GEMINI_LANTAW_MODEL`,
`NEXT_SERVICE_ROLE_KEY`, and the existing OpenWeather key. Optionally set
`GEMINI_LANTAW_FALLBACK_MODEL` to another model enabled for the same Gemini key.
No model or key configuration was changed by this patch.

Consistency and performance
---------------------------
`src/lib/domain-values.mjs` defines the existing role and resource-request status
identifiers. Comparisons normalize case/spacing while writes retain existing
canonical values. Unknown roles fail closed; unknown statuses are displayed as
unknown rather than silently treated as Pending. Login, route authorization,
dashboard cards, utility badges, request tables and workflow controls use the
same mappings. Provincial notification badges now use the provincial role.

Request detail queries run in parallel, coalesce realtime bursts, subscribe to
request item changes, and use a visible-page 30-second fallback rather than
three serial queries every three seconds. Coordinates are memoized to prevent
repeated geocoding on unrelated renders. VPN polling continues, but initial
background IP lookup no longer blocks rendering an authorized dashboard.

The situational-report migration also permits the existing `Pending_AI` initial
status, alongside `pending`, without treating either as accepted. Main report
acceptance still requires `Verified`.

Verification
------------
Run `node --test tests/*.test.mjs`. Tests execute the analytics component with
controlled hook, auth and realtime adapters, execute the API with controlled
database/provider responses, and exercise High-only eligibility, canonical
status comparisons, provider backoff and output validation. These are local
regressions; live Supabase/provider checks require network access.
