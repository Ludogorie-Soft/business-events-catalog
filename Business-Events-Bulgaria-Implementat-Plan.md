# Business Events Bulgaria - Implementation Plan

## Project Overview

Business Events Bulgaria is a web application for discovering and subscribing to business events in Bulgaria.

### Technology Stack

* Next.js App Router
* TypeScript
* Tailwind CSS
* Prisma ORM
* PostgreSQL
* NextAuth/Auth.js
* Brevo (emails)
* Vercel (free plan)

### Initial Regions

* Sofia
* Vratsa
* Montana
* Pleven
* Online

### User Roles

#### Guest

* Browse events
* Filter events
* View event details

#### Registered User

* Everything Guest can do
* Mark events as Interested / Attending
* Create event subscriptions
* Receive daily/weekly email notifications

#### Admin

* Create events
* Edit events
* Publish/cancel events
* View registered users
* Monitor crawling sources
* Trigger crawlers manually

---

# CHECKPOINT 1 - Project Setup

## Goal

Create the initial application.

## Tasks

* [ ] Create Next.js App Router project
* [ ] Configure TypeScript
* [ ] Configure Tailwind CSS
* [ ] Configure PostgreSQL
* [ ] Configure Prisma
* [ ] Create Bulgarian layout
* [ ] Setup environment variables

## Done when

* [ ] App runs locally
* [ ] Database connection works

---

# CHECKPOINT 2 - Prisma Schema

## Goal

Create database models.

## Users

```prisma
User
```

Fields:

* id
* email
* passwordHash
* name
* role
* city
* createdAt

---

## Cities

```prisma
City
```

Fields:

* id
* slug
* nameBg
* nameEn
* region

Seed:

* Sofia
* Vratsa
* Montana
* Pleven
* Online

---

## Event Types

Examples:

* Conference
* Workshop
* Meetup
* Webinar
* Networking
* Training
* Masterclass
* Panel Discussion
* Expo
* Business Breakfast

---

## Topics

Examples:

* Entrepreneurship
* Startups
* AI
* Marketing
* Sales
* Finance
* HR
* Leadership
* Agriculture
* Tourism
* EU Funding

---

## Tags

Flexible detailed classification.

Examples:

* networking
* startup
* grants
* agriculture
* SME
* B2B
* export
* AI
* rural business

Fields:

* id
* slug
* nameBg
* nameEn

---

## Organizers

Fields:

* id
* name
* websiteUrl
* linkedinUrl
* facebookUrl
* logoUrl

---

## Venues

Fields:

* id
* cityId
* name
* address
* latitude
* longitude

---

## Events

Mandatory:

* id
* title
* slug
* startAt
* endAt
* timezone
* cityId
* locationType
* eventTypeId
* priceType
* status
* createdBy
* createdAt
* updatedAt

Optional:

* shortDescription
* descriptionHtml
* descriptionText
* venueId
* organizerId
* onlineUrl
* registrationUrl
* externalUrl
* sourceId
* language
* priceMin
* priceMax
* currency
* coverImageUrl
* capacity
* featured

---

## Many-to-many tables

```prisma
EventTopic
EventTag
```

---

## Sources

Fields:

* id
* name
* sourceKey
* websiteUrl
* active
* lastCheckedAt
* lastSuccessAt
* lastEventsFoundCount
* lastError

---

## Crawl Runs

Fields:

* id
* sourceId
* status
* startedAt
* finishedAt
* eventsFound
* eventsCreated
* eventsUpdated
* errorMessage

---

## Event Attendance

Fields:

* userId
* eventId
* status

Status:

* interested
* attending
* cancelled

---

## Subscriptions

Fields:

* id
* userId
* name
* frequency
* active

Frequency:

* daily
* weekly

---

## Subscription Filters

Many-to-many tables:

```prisma
SubscriptionCity
SubscriptionEventType
SubscriptionTopic
SubscriptionTag
```

---

## Email Notifications

```prisma
EmailNotification
EmailNotificationEvent
```

---

## Done when

* [ ] Prisma migration works
* [ ] Seed script runs successfully

---

# CHECKPOINT 3 - Authentication

## Goal

Email/password authentication.

## Tasks

* [ ] Registration
* [ ] Login
* [ ] Logout
* [ ] User role support

Roles:

* USER
* ADMIN

## Done when

* [ ] Login works
* [ ] Admin routes are protected

---

# CHECKPOINT 4 - Public Event Browsing

## Pages

* /events
* /events/[slug]

Filters:

* City
* Event type
* Topic
* Tags
* Free/Paid
* Online/Physical/Hybrid
* Language
* Date range

## Done when

* [ ] Event listing works
* [ ] Filters work
* [ ] Event details page works

---

# CHECKPOINT 5 - SEO City Pages

## Pages

* /city/sofia
* /city/vratsa
* /city/montana
* /city/pleven
* /online

## Each page contains

* SEO title
* Meta description
* Upcoming events
* Intro text

## Done when

* [ ] All city pages work

---

# CHECKPOINT 6 - Admin Event Management

## Pages

* /admin/events
* /admin/events/new
* /admin/events/[id]

## Features

* Create event
* Edit event
* Publish event
* Cancel event

Rich text fields:

* descriptionHtml
* descriptionText

## Done when

* [ ] Admin can manage events

---

# CHECKPOINT 7 - Tags

## Goal

Support multiple tags.

## Features

* Assign tags to events
* Filter events by tags

## Done when

* [x] Event tags work

---

# CHECKPOINT 8 - Event Attendance

## Features

User can mark:

* Interested
* Attending
* Cancelled

## Profile page

```
/profile/events
```

## Done when

* [x] Attendance works

---

# CHECKPOINT 9 - Event Subscriptions

## Filters

* Cities
* Event types
* Topics
* Tags
* Free/Paid
* Online/Physical/Hybrid
* Language
* Max price

Frequency:

* Daily
* Weekly

## Done when

* [x] Multiple subscriptions per user work

---

# CHECKPOINT 10 - Brevo Emails

## Email Types

### Welcome Email

### Daily Digest

### Weekly Digest

Weekly digest should be sent Monday morning.

### Unsubscribe Email

## Done when

* [x] Emails are delivered successfully

---

# CHECKPOINT 11 - Crawling Framework

## Folder Structure

```text
src/crawlers
    index.ts
    types.ts

    sources/
        eventbrite.ts
        startupcouncil.ts
```

## Crawled Event Structure

```typescript
type CrawledEvent = {
    sourceKey: string
    sourceEventId?: string
    title: string
    descriptionHtml?: string
    startAt: Date
    endAt?: Date
    city?: string
    locationType: "physical" | "online" | "hybrid"
    venueName?: string
    registrationUrl?: string
    externalUrl: string
    priceType?: "free" | "paid" | "unknown"
    language?: "bg" | "en" | "mixed"
    organizerName?: string
    tags?: string[]
}
```

## Rules

* Events are automatically published.
* Duplicate detection uses externalUrl.
* Events are linked to source.

## Done when

* [x] First crawler imports events

---

# CHECKPOINT 12 - Source Monitoring

## Admin Page

```
/admin/sources
```

Show:

* Source name
* Active
* Last checked
* Last success
* Events found
* Last error

Actions:

* Enable source
* Disable source
* Run crawler manually

## Done when

* [ ] Source monitoring works

---

# CHECKPOINT 13 - Scheduled Jobs (cron-job.org)

## Goal

Run background tasks on a free Vercel account without relying on Vercel Cron limitations.

Use **cron-job.org** as the scheduler and protected Next.js API routes as job endpoints.

---

## Environment Variables

```env
CRON_SECRET=super-secret-token
```

---

## API Routes

### Crawl Events

```text
/api/cron/crawl-events
```

Purpose:

* Run all active crawlers
* Import new events
* Update existing events
* Store crawl statistics

---

### Daily Digest

```text
/api/cron/send-daily-digest
```

Purpose:

* Find users with daily subscriptions
* Match events against filters
* Send email digests via Brevo
* Store sent notifications

---

### Weekly Digest

```text
/api/cron/send-weekly-digest
```

Purpose:

* Find users with weekly subscriptions
* Match events against filters
* Send weekly email digests
* Store sent notifications

Weekly emails should be sent Monday morning.

---

## Route Protection

Every cron endpoint must validate:

```typescript
const authHeader = request.headers.get("authorization")

if (
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
) {
    return new Response("Unauthorized", {
        status: 401
    })
}
```

---

## cron-job.org Jobs

### Job 1 - Crawl Events

URL:

```text
https://your-domain.com/api/cron/crawl-events
```

Schedule:

```text
Every day
06:00 Europe/Sofia
```

Headers:

```text
Authorization: Bearer CRON_SECRET
```

---

### Job 2 - Daily Digest

URL:

```text
https://your-domain.com/api/cron/send-daily-digest
```

Schedule:

```text
Every day
08:00 Europe/Sofia
```

Headers:

```text
Authorization: Bearer CRON_SECRET
```

---

### Job 3 - Weekly Digest

URL:

```text
https://your-domain.com/api/cron/send-weekly-digest
```

Schedule:

```text
Monday
09:00 Europe/Sofia
```

Headers:

```text
Authorization: Bearer CRON_SECRET
```

---

## Suggested Internal Structure

```text
src/

cron/
    crawl-events.ts
    send-daily-digest.ts
    send-weekly-digest.ts

app/
    api/
        cron/
            crawl-events/
                route.ts
            send-daily-digest/
                route.ts
            send-weekly-digest/
                route.ts
```

API routes should only:

1. Validate CRON_SECRET
2. Call the corresponding service
3. Return execution result

Business logic should remain in:

```text
src/cron/
```

---

## Logging

Every execution should create logs.

### Crawl Runs

Table:

```text
crawl_runs
```

Fields:

* source_id
* started_at
* finished_at
* status
* events_found
* events_created
* events_updated
* error_message

---

### Email Notifications

Table:

```text
email_notifications
```

Fields:

* user_id
* subscription_id
* subject
* sent_at
* status
* error_message

---

## Future Improvements (V2)

Possible migration:

```text
cron-job.org
    ↓

Upstash QStash
    ↓

BullMQ + Redis
```

without changing business logic, only replacing the trigger mechanism.

---

## Done When

* [ ] CRON_SECRET is configured
* [ ] `/api/cron/crawl-events` works
* [ ] `/api/cron/send-daily-digest` works
* [ ] `/api/cron/send-weekly-digest` works
* [ ] cron-job.org is configured
* [ ] Crawl job runs automatically
* [ ] Daily emails are sent
* [ ] Weekly Monday emails are sent
* [ ] Logs are stored in database
* [ ] Unauthorized requests are rejected

---

# CHECKPOINT 14 - User Dashboard

Pages:

```
/profile
/profile/events
/profile/subscriptions
```

Features:

* View attending events
* Manage subscriptions
* Edit profile

## Done when

* [ ] Dashboard works

---

# CHECKPOINT 15 - Production Deployment

## Tasks

* [ ] Configure Vercel
* [ ] Configure PostgreSQL
* [ ] Configure Brevo
* [ ] Configure cron secret

## Done when

* [ ] Production app works

---

# MVP Acceptance Criteria

## Public

* [ ] Browse events without registration
* [ ] Filter events
* [ ] SEO city pages work

## Users

* [ ] Register and login
* [ ] Mark events as attending
* [ ] Create subscriptions
* [ ] Receive daily emails
* [ ] Receive weekly emails

## Admin

* [ ] Create events
* [ ] Edit events
* [ ] Publish events
* [ ] View users
* [ ] Monitor sources

## Crawlers

* [ ] Import events automatically
* [ ] Avoid duplicates using externalUrl
* [ ] Monitor source health

## Deployment

* [ ] Runs on Vercel free account
* [ ] Uses PostgreSQL
* [ ] Uses Prisma
* [ ] Uses Brevo
