import type { CrawledEvent } from "@/crawlers/types";

const SOURCE_KEY = "meetup";
// Meetup's own web client endpoint; it serves public search queries anonymously.
const GRAPHQL_URL = "https://www.meetup.com/gql2";
const SOFIA = { lat: 42.6977, lon: 23.3219 };
const RADIUS_MILES = 30;
const PAGE_SIZE = 100;
const MAX_PAGES = 5;

// Meetup group categories worth listing: "Career & Business" and "Technology".
const RELEVANT_CATEGORY_IDS = new Set(["405", "546"]);

const SEARCH_QUERY = `
  query SofiaEvents($filter: RecommendedEventsFilter!, $first: Int, $after: String, $sort: RecommendedEventsSort) {
    recommendedEvents(filter: $filter, first: $first, after: $after, sort: $sort) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          title
          description
          dateTime
          endTime
          eventType
          eventUrl
          feeSettings { amount currency }
          featuredEventPhoto { highResUrl }
          venue { name address city country }
          group { name topicCategory { id } }
        }
      }
    }
  }
`;

type MeetupEvent = {
  id: string;
  title: string;
  description?: string | null;
  dateTime: string;
  endTime?: string | null;
  eventType: "PHYSICAL" | "ONLINE" | "HYBRID";
  eventUrl: string;
  feeSettings?: { amount?: number | null; currency?: string | null } | null;
  featuredEventPhoto?: { highResUrl?: string | null } | null;
  venue?: {
    name?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
  group?: { name?: string | null; topicCategory?: { id?: string | null } | null } | null;
};

type SearchResponse = {
  data?: {
    recommendedEvents?: {
      pageInfo: { hasNextPage: boolean; endCursor?: string | null };
      edges: { node: MeetupEvent }[];
    };
  };
  errors?: { message: string }[];
};

async function fetchPage(after?: string) {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: {
        first: PAGE_SIZE,
        after,
        sort: { sortField: "DATETIME" },
        filter: {
          lat: SOFIA.lat,
          lon: SOFIA.lon,
          radius: RADIUS_MILES,
          eventType: "PHYSICAL",
          doConsolidateEvents: false,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${GRAPHQL_URL}: HTTP ${response.status}`);
  }

  const json = (await response.json()) as SearchResponse;
  if (json.errors?.length) {
    throw new Error(`Meetup GraphQL error: ${json.errors[0].message}`);
  }
  if (!json.data?.recommendedEvents) {
    throw new Error("Meetup GraphQL response has no recommendedEvents");
  }
  return json.data.recommendedEvents;
}

async function fetchAllEvents() {
  const events: MeetupEvent[] = [];
  let after: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const connection = await fetchPage(after);
    events.push(...connection.edges.map((edge) => edge.node));
    if (!connection.pageInfo.hasNextPage || !connection.pageInfo.endCursor) {
      break;
    }
    after = connection.pageInfo.endCursor;
  }

  return events;
}

function isSofiaVenue(event: MeetupEvent) {
  const country = event.venue?.country?.toLowerCase();
  const city = event.venue?.city ?? "";
  return country === "bg" && /sofia|софия/i.test(city);
}

function isRelevantCategory(event: MeetupEvent) {
  const categoryId = event.group?.topicCategory?.id;
  return Boolean(categoryId && RELEVANT_CATEGORY_IDS.has(categoryId));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Meetup descriptions are Markdown; convert the common bits to safe HTML. */
function markdownToHtml(markdown: string) {
  return markdown
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => {
      const html = escapeHtml(paragraph.trim())
        .replace(/\\([\\`*_{}[\]()#+\-.!])/g, "$1")
        .replace(
          /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
          '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
        )
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|\n)#{1,6}\s+([^\n]+)/g, "$1<strong>$2</strong>")
        .replace(/\n/g, "<br>");
      return html ? `<p>${html}</p>` : "";
    })
    .join("");
}

function detectLanguage(text: string): CrawledEvent["language"] {
  const hasCyrillic = /[А-Яа-яЁё]/.test(text);
  const hasLatin = /[A-Za-z]/.test(text);
  if (hasCyrillic && hasLatin) return "mixed";
  if (hasCyrillic) return "bg";
  return "en";
}

function parseDate(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeEventUrl(url: string) {
  const parsed = new URL(url);
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function mapEvent(event: MeetupEvent): CrawledEvent | null {
  const startAt = parseDate(event.dateTime);
  if (!startAt || !event.title?.trim()) return null;

  const endAt = parseDate(event.endTime);
  const externalUrl = normalizeEventUrl(event.eventUrl);
  const fee = event.feeSettings;
  const amount = fee?.amount ?? undefined;
  const description = event.description?.trim();

  return {
    sourceKey: SOURCE_KEY,
    sourceEventId: event.id,
    title: event.title.trim(),
    descriptionHtml: description ? markdownToHtml(description) : undefined,
    startAt,
    endAt: endAt && endAt > startAt ? endAt : undefined,
    city: "sofia",
    locationType: event.eventType === "HYBRID" ? "hybrid" : "physical",
    venueName: event.venue?.name?.trim() || undefined,
    registrationUrl: externalUrl,
    externalUrl,
    priceType: fee ? (amount && amount > 0 ? "paid" : "free") : "free",
    priceMin: fee && amount !== undefined ? amount : undefined,
    currency: fee?.currency?.toUpperCase() || undefined,
    language: detectLanguage(`${event.title} ${description ?? ""}`),
    organizerName: event.group?.name?.trim() || undefined,
    coverImageUrl: event.featuredEventPhoto?.highResUrl ?? undefined,
  };
}

export const meetupCrawler = {
  sourceKey: SOURCE_KEY,
  async crawl(): Promise<CrawledEvent[]> {
    const events = await fetchAllEvents();
    const byId = new Map<string, CrawledEvent>();

    for (const event of events) {
      if (event.eventType === "ONLINE") continue;
      if (!isSofiaVenue(event) || !isRelevantCategory(event)) continue;

      const mapped = mapEvent(event);
      if (mapped?.sourceEventId) byId.set(mapped.sourceEventId, mapped);
    }

    return [...byId.values()];
  },
};
