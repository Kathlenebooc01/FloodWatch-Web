# OpenAQ air monitoring

The air map calls `/api/monitoring/air`. Only this route fetches OpenAQ data;
weather and heat monitoring keep their existing sources.

`OPENAQ_API_KEY` belongs in the ignored local `.env`, without a `NEXT_PUBLIC_`
prefix. Requests send the key only to `https://api.openaq.org`.

Verified coverage on October 11, 2026: location 6455462, Lapu-Lapu City,
Clarity sensor 17002975, measuring PM2.5 in µg/m³. This is a sensor, not a
reference monitor. It is mapped only to Lapu-Lapu City's municipality record.
No reading is copied to Cebu City or other municipalities.

The map retains its US AQI design. The AQI is calculated from recent hourly
PM2.5 using EPA's 12-hour NowCast weighting and current PM2.5 breakpoints.
It requires two valid, unflagged hours among the latest three clock hours.
The displayed PM2.5 is the latest raw measurement, so it need not correspond
directly to the displayed NowCast AQI. Other pollutants remain null.

Updates run when the air map polls, at most once per ten minutes per server
process. The page must stay open for ongoing polling. There is no background
schedule when the local app is stopped or nobody opens the map.

Only verified, recent readings are saved to `air_quality`. Existing readings
are preserved. A provenance tag is appended to the existing status text:
` | OpenAQ:6455462;Clarity;PM2.5 NowCast`. The air endpoint strips the tag for
display and supplies source metadata. Identical observations are skipped;
changes to NowCast for the same observation update only that tagged row.
Concurrent server processes can still create duplicates without a database
unique constraint. Failures display the last saved value and an update status.

References:
- https://docs.openaq.org/resources/latest
- https://docs.openaq.org/resources/measurements
- https://document.airnow.gov/technical-assistance-document-for-the-reporting-of-daily-air-quailty.pdf
