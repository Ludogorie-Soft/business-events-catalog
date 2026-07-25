/**
 * Maps free-text (title, description, tags) to seeded Topic slugs.
 * Patterns are matched case-insensitively as substrings.
 */
const TOPIC_KEYWORDS: Array<{ slug: string; patterns: string[] }> = [
  {
    slug: "ai",
    patterns: [
      "artificial intelligence",
      "machine learning",
      "изкуствен интелект",
      " generative ai",
      " genai",
      " llm",
      "chatgpt",
      " openai",
      " deep learning",
      " ai ",
      "ai-",
      "-ai ",
      "ai:",
      "(ai)",
    ],
  },
  {
    slug: "startups",
    patterns: ["startup", "start-up", "стартъп", "стартап"],
  },
  {
    slug: "entrepreneurship",
    patterns: [
      "entrepreneur",
      "предприема",
      "founders",
      "founder ",
      "self-employed",
      "solopreneur",
    ],
  },
  {
    slug: "marketing",
    patterns: ["marketing", "маркетинг", "branding", "seo ", "content marketing"],
  },
  {
    slug: "sales",
    patterns: [" sales", "sales ", "продажб", "b2b sales", "closing deals"],
  },
  {
    slug: "finance",
    patterns: [
      "finance",
      "финанси",
      "investment",
      "инвестиц",
      "venture capital",
      " fundraising",
      "accounting",
      "счетовод",
    ],
  },
  {
    slug: "hr",
    patterns: [
      " human resources",
      " hr ",
      "hr-",
      "човешки ресурси",
      "recruiting",
      "recruitment",
      "talent acquisition",
      "people ops",
      "employer branding",
    ],
  },
  {
    slug: "leadership",
    patterns: ["leadership", "лидерств", "management skills", "executive coach"],
  },
  {
    slug: "agriculture",
    patterns: ["agriculture", "земедел", "agri", "farming", "агро"],
  },
  {
    slug: "tourism",
    patterns: ["tourism", "туриз", "hospitality", "хотелиер"],
  },
  {
    slug: "eu-funding",
    patterns: [
      "eu funding",
      "европейско финансиране",
      "европейски фонд",
      "еврофондове",
      "horizon europe",
      "erasmus",
      "grant",
      "грант",
    ],
  },
];

function normalizeForMatch(value: string) {
  return ` ${value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s+-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

export function inferTopicSlugs(input: {
  title?: string | null;
  descriptionHtml?: string | null;
  descriptionText?: string | null;
  tags?: string[] | null;
  topics?: string[] | null;
}): string[] {
  const explicit = (input.topics ?? [])
    .map((slug) => slug.trim().toLowerCase())
    .filter(Boolean);

  const haystack = normalizeForMatch(
    [
      input.title ?? "",
      input.descriptionText ?? "",
      (input.descriptionHtml ?? "").replace(/<[^>]+>/g, " "),
      ...(input.tags ?? []),
    ].join(" ")
  );

  const inferred: string[] = [];
  for (const { slug, patterns } of TOPIC_KEYWORDS) {
    if (patterns.some((pattern) => haystack.includes(pattern.toLowerCase()))) {
      inferred.push(slug);
    }
  }

  return [...new Set([...explicit, ...inferred])];
}
