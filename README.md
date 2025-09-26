🏨 Paris Booking Scrapers (English)

Collection of scrapers to analyze Paris hotel data from Booking.com and load results into Google BigQuery.

## Folder Structure

```
.
├── scrapers/
│   ├── arrondissement-count/          # Simple scraper: daily summary by arrondissement
│   │   └── scraper.js                 # Writes to MarketData.ArrondissementSummary
│   ├── hotel-data-180days/            # Advanced scraper: 180 days by arrondissement and checkin date
│   │   └── scraper.js                 # Writes to MarketData.Arrondissement
│   └── room-policies/                 # Room policies, price, and availability by hotel/room
│       └── index.js                   # Writes to HotelsPrices.Booking_Scrapper
└── .github/workflows/
    ├── daily-scraper.yml              # 06:00 UTC - arrondissement-count
    ├── hotel-data-180days.yml         # 02:00 UTC - hotel-data-180days
    └── room-policies.yml              # 04:00 UTC - room-policies
```

## BigQuery Destinations

- Arrondissement Summary (simple): `oversight-datalake.MarketData.ArrondissementSummary`
- Arrondissement by checkin (180 days): `oversight-datalake.MarketData.Arrondissement`
- Room policies and prices: `oversight-datalake.HotelsPrices.Booking_Scrapper`

All tables are created automatically if they do not exist.

## Prerequisites

- Node.js >= 18
- A Google Cloud Service Account with BigQuery write access
- Service Account JSON contents stored as a GitHub Actions Secret named `GCP_SA_KEY`

## Local Run

1) Arrondissement Summary

```bash
cd scrapers/arrondissement-count
npm install
node scraper.js
```

2) Arrondissement (180 days)

```bash
cd scrapers/hotel-data-180days
npm install
node scraper.js
```

3) Room Policies (inserts directly to BigQuery)

```bash
cd scrapers/room-policies
npm install
node index.js
```

By default, scrapers read credentials from `./bigquery-credentials.json` within their folder. In CI, the file is generated from the `GCP_SA_KEY` secret.

## GitHub Actions (Daily)

Three workflows are provided:

- `daily-scraper.yml` – runs arrondissement summary at 06:00 UTC
- `hotel-data-180days.yml` – runs 180-day scraper at 02:00 UTC
- `room-policies.yml` – runs room policies at 04:00 UTC

To enable them:
1. Go to GitHub: Settings → Secrets and variables → Actions
2. Create secret `GCP_SA_KEY` with the full Service Account JSON content
3. Actions → select a workflow → “Run workflow” to trigger manually, or wait for the daily schedule

## BigQuery Verification

Example queries:

```sql
-- Latest room policies
SELECT *
FROM `oversight-datalake.HotelsPrices.Booking_Scrapper`
ORDER BY ObservationDate DESC
LIMIT 50;

-- Arrondissement summary
SELECT *
FROM `oversight-datalake.MarketData.ArrondissementSummary`
ORDER BY ObservationDate DESC
LIMIT 50;

-- Arrondissement by checkin
SELECT *
FROM `oversight-datalake.MarketData.Arrondissement`
ORDER BY CheckinDate DESC
LIMIT 50;
```

## Notes

- Scrapers use Puppeteer with stealth plugin and randomized delays.
- Room policies scraper stops writing CSV locally; it writes directly to BigQuery.
- Concurrency and date ranges can be tuned via environment variables in `room-policies/index.js` (e.g., `BATCH_LIMIT`, `BATCH_SIZE`, `DATE_DAYS`).


