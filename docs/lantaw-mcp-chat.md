Lantaw chat now calls the configured MCP server through a reused SDK client and
an in-process MCP transport. This executes the same registered tools as the
standalone stdio server without launching a child process for every message.
Standalone startup is `node src/lantaw/mcp_cli.mjs`; both `.env` and
`.env.local` are loaded, and process environment variables take precedence.

The AI retains its FloodWatch topic restriction; unrelated questions, including
standalone arithmetic, are outside its scope. Greetings use the AI rather than
canned local replies. Municipality weather questions call `get_municipality_weather`:
the tool resolves the backend municipality name and queries only that ID's
weather. Fresh readings are returned directly with their timestamp and source.
Freshness follows the backend expiry, with a one-hour limit when no expiry exists.
If telemetry is stale, OpenWeather uses registered municipality coordinates
(or its name when coordinates are absent). Nearby station names are accepted only
when returned coordinates match that location. If live weather fails, the latest
stored reading is explicitly labelled outdated and includes its date and year;
it is never presented as today's weather. Internal UUIDs are excluded.

Named-municipality Monitoring questions for air quality, heat index and hazards
call `get_monitoring_snapshot`. It reads the latest matching weather and air
rows for that municipality, the heat index stored with weather telemetry (or
calculates it from temperature and humidity as the Heat Index map does), and
municipality alerts and incident reports. Air and heat answers include the
reading timestamp and mark readings older than one hour as historical. A
historical air quality row triggers a short OpenWeather Air Pollution lookup
at the municipality's registered coordinates. Its current 1–5 AQI scale is
named explicitly and never mixed with the stored US AQI scale. If that lookup
fails or is old, the dated stored row remains the fallback; it is not presented
as today's measurement. Hazard map
layers and regional advisory feeds are separate from these municipal records;
the assistant must not claim they were included in the snapshot.

Other factual questions call `get_floodwatch_chat_context` for their relevant
categories in parallel. Supported sources include weather, air quality, reports,
distress signals, inventory, utilities, requests, allocations, municipality alerts,
news, announcements, and schedules. Mixed questions retain each relevant context;
FloodWatch overview questions retrieve all these categories. Reads include up to
100 recent records per category (50 each for news and announcements), with total
counts and truncation metadata where available. A failed source is disclosed and
does not hide successful sources. This is access to the supported operational
categories, not an unrestricted database dump. Ordinary answers use a shorter
prompt and at most 800 output tokens.
The configured Gemini Flash model uses minimal thinking. Chat generation has
three private attempts that reuse the exact same verified MCP context: the
primary `GEMINI_LANTAW_MODEL`/`GEMINI_LANTAW_AI`, a second model configured by
`GEMINI_LANTAW_BACKUP_MODEL`/`GEMINI_LANTAW_BACKUP_AI`, and a third model
configured by `GEMINI_LANTAW_THIRD_MODEL`/`GEMINI_LANTAW_THIRD_AI`. The second
and third model defaults are `gemini-3.5-flash-lite` and `gemini-3.8-flash`.
When no separate third key is configured, it uses the second key. Each attempt
has a 5.5-second limit within a 16.5-second total provider deadline. Backups
are not exposed in the chat response or user interface. If every provider
attempt fails, the user receives an availability error; backups cannot bypass
a project-wide quota or provider outage. Ordinary chat uses Gemini streaming and displays
real partial output as it arrives; files and charts wait for complete structured output.
Explicit document/chart requests retain their existing output formats and
a larger output budget. Recent conversation history is included for follow-ups.

History writes and API logging run with Next's `after` lifecycle, so the response
does not wait for those writes. New answers display immediately; the artificial
word-by-word reveal was removed. This does not make Gemini or network latency
instantaneous. `latency_ms` in the response measures actual server processing
time. The weather tool is for current readings, not historical weather archives.

Validation includes actual MCP tool discovery and calls through the SDK,
municipality isolation, stale/wrong-location weather rejection, scoped reads,
FloodWatch scope instructions, bounded provider calls and endpoint dispatch. Run
`node --test tests/*.test.mjs`. Live provider latency requires network access.
