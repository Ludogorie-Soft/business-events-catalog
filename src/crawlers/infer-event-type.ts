import type { CrawledLocationType } from "@/crawlers/types";

/**
 * Maps free-text + location to seeded EventType slugs.
 * More specific patterns are checked first.
 */
const EVENT_TYPE_KEYWORDS: Array<{ slug: string; patterns: string[] }> = [
  {
    slug: "business-breakfast",
    patterns: ["business breakfast", "бизнес закуска", "breakfast meetup"],
  },
  {
    slug: "masterclass",
    patterns: ["masterclass", "master class", "мастъркласс", "мастърклас"],
  },
  {
    slug: "panel-discussion",
    patterns: ["panel discussion", "панелна дискусия", "panel talk"],
  },
  {
    slug: "expo",
    patterns: [
      " expo",
      "expo ",
      "exhibition",
      "изложение",
      "comic con",
      " trade show",
      "tradeshow",
      " wine & spirits show",
      " show",
    ],
  },
  {
    slug: "conference",
    patterns: ["conference", "конференция", "конференцията", "summit", " форум", "forum "],
  },
  {
    slug: "workshop",
    patterns: ["workshop", "уъркшоп", "уorkshop", "hands-on"],
  },
  {
    slug: "training",
    patterns: ["training", "обучение", "course ", "курс ", "seminar", "семинар"],
  },
  {
    slug: "networking",
    patterns: [
      "networking",
      "нетуъркинг",
      "night out",
      "social party",
      "afterwork",
      "after work",
      "mixer",
    ],
  },
  {
    slug: "meetup",
    patterns: ["meetup", "meet-up", "среща", "gathering"],
  },
  {
    slug: "webinar",
    patterns: ["webinar", "уебинар", "virtual lunch", "online lecture", "livestream"],
  },
];

function normalizeForMatch(value: string) {
  return ` ${value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s+-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

export function inferEventTypeSlug(input: {
  title?: string | null;
  descriptionHtml?: string | null;
  descriptionText?: string | null;
  tags?: string[] | null;
  locationType?: CrawledLocationType | string | null;
  eventTypeSlug?: string | null;
}): string {
  if (input.eventTypeSlug?.trim()) {
    return input.eventTypeSlug.trim().toLowerCase();
  }

  const haystack = normalizeForMatch(
    [
      input.title ?? "",
      input.descriptionText ?? "",
      (input.descriptionHtml ?? "").replace(/<[^>]+>/g, " "),
      ...(input.tags ?? []),
    ].join(" ")
  );

  for (const { slug, patterns } of EVENT_TYPE_KEYWORDS) {
    if (patterns.some((pattern) => haystack.includes(pattern.toLowerCase()))) {
      return slug;
    }
  }

  const location = (input.locationType ?? "").toString().toLowerCase();
  if (location === "online") return "webinar";
  if ((input.tags ?? []).some((tag) => tag.toLowerCase() === "networking")) {
    return "networking";
  }
  return "meetup";
}
