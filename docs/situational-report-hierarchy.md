The web table retains its existing columns, badges, row styles, and details modal.
Municipalities are keyed by `municipality_id`, main reports by `report_id`, and
updates by `parent_report_id`. Main reports start expanded; clicking their row
or dropdown arrow toggles update visibility independently. The eye button opens
main report details, and clicking an update opens that update's details. Updates appear
oldest first. The main status remains visible alongside the latest update status.

Database setup
--------------
Apply `supabase/migrations/202610070001_situational_report_hierarchy.sql` through
the project's Supabase migration process or SQL editor before using linked
updates. This migration uses the existing `Verified` acceptance status and
`reviewed_by` / `reviewed_at` fields. It adds one nullable foreign key because
the checked-in `openapi.json` has no equivalent relationship. Check the live
schema before applying if it has diverged from that snapshot.

The trigger checks direct database writes as well as API writes. It requires a
verified root in the same municipality, resolves update IDs to that root,
prevents reparenting and cycles, and prevents authenticated LGU callers from
self-verifying. Existing RLS policies still apply. Trusted service-role writes
may perform reviews; parent acceptance and municipality checks still apply.

There is no existing LGU report creation form in this web repository. The LGU
client should populate “Link to Existing Report” using
`GET /api/situational-reports`, with its Supabase access token in
`Authorization: Bearer <token>`. This endpoint returns only verified main
situational reports in the caller's municipality.

Submit an update using `POST /api/situational-reports` with the same authorization
and JSON `{ "parent_report_id": "<original-report-uuid>", "description": "...",
"image_url": "..." }`. An empty image URL is allowed for text-only updates.
The server sets ownership, municipality, pending status and the original root ID.
Unverified parents return HTTP 409. The trigger rechecks acceptance during insert.
LGU clients that write directly through Supabase must set `parent_report_id`;
they are protected by the same trigger after the migration is installed.

Legacy records without parent IDs remain main reports. Assign their true original
IDs from an authoritative source before installing the trigger if needed; titles
cannot establish those relationships. Legacy chained relationships are flattened
for display, and new writes always reference the root. Missing, cyclic or
cross-municipality relationships produce a table warning and are never promoted
to main reports.

Validation: `node --test tests/*.test.mjs` and targeted ESLint. Live database
validation requires access to the Supabase endpoint and an installed migration.
