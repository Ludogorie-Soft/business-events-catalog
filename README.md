# Business Events Bulgaria

Web catalog for discovering and subscribing to business events in Bulgaria.

## Getting Started

1. Copy `.env.example` to `.env` and fill in the values.
2. Start PostgreSQL:

```bash
docker compose up -d
```

3. Run migrations and seed reference data:

```bash
npm install
npm run db:migrate
npm run db:seed
```

4. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Default admin user after seed: `admin@example.com` / `admin1234`

## Crawling Online Events

The app can import online business events from active sources such as Eventbrite and Startup Council.

### Prerequisites

- PostgreSQL is running
- Database is migrated and seeded (`npm run db:seed` creates crawl sources)
- `.env` contains a valid `DATABASE_URL`

### Test crawlers without importing

Parses source pages and prints the events that would be imported:

```bash
npm run crawl:test
```

### Import events from the terminal

Runs all active crawlers and saves new/updated events to the database:

```bash
npm run crawl:run
```

Import from a single source:

```bash
npm run crawl:run eventbrite
npm run crawl:run startupcouncil
```

### Import via protected API route

Useful for cron-job.org or other schedulers:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/crawl-events
```

Single source:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "http://localhost:3000/api/cron/crawl-events?source=eventbrite"
```

Set `CRON_SECRET` in `.env`.

### Import from the admin UI

1. Log in as an admin user
2. Open [http://localhost:3000/admin](http://localhost:3000/admin)
3. Click **Изтегли събития**
4. The page shows how many new events were imported and how many existing ones were updated

Imported events are published automatically. Duplicate detection uses `externalUrl`.

## Useful Commands

```bash
npm run db:studio      # Open Prisma Studio
npm run dev:clean      # Clear Next.js cache and restart dev server
npm run lint           # Run ESLint
```
