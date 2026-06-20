import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });


const prisma = new PrismaClient({ adapter });

async function main() {
  // Cities
  const cities = await Promise.all([
    prisma.city.upsert({
      where: { slug: "sofia" },
      update: {},
      create: { slug: "sofia", nameBg: "София", nameEn: "Sofia", region: "Sofia" },
    }),
    prisma.city.upsert({
      where: { slug: "vratsa" },
      update: {},
      create: { slug: "vratsa", nameBg: "Враца", nameEn: "Vratsa", region: "Vratsa" },
    }),
    prisma.city.upsert({
      where: { slug: "montana" },
      update: {},
      create: { slug: "montana", nameBg: "Монтана", nameEn: "Montana", region: "Montana" },
    }),
    prisma.city.upsert({
      where: { slug: "pleven" },
      update: {},
      create: { slug: "pleven", nameBg: "Плевен", nameEn: "Pleven", region: "Pleven" },
    }),
    prisma.city.upsert({
      where: { slug: "online" },
      update: {},
      create: { slug: "online", nameBg: "Онлайн", nameEn: "Online", region: "Online" },
    }),
  ]);
  console.log(`Seeded ${cities.length} cities`);

  // Event Types
  const eventTypes = await Promise.all([
    prisma.eventType.upsert({ where: { slug: "conference" }, update: {}, create: { slug: "conference", nameBg: "Конференция", nameEn: "Conference" } }),
    prisma.eventType.upsert({ where: { slug: "workshop" }, update: {}, create: { slug: "workshop", nameBg: "Уъркшоп", nameEn: "Workshop" } }),
    prisma.eventType.upsert({ where: { slug: "meetup" }, update: {}, create: { slug: "meetup", nameBg: "Срещa", nameEn: "Meetup" } }),
    prisma.eventType.upsert({ where: { slug: "webinar" }, update: {}, create: { slug: "webinar", nameBg: "Уебинар", nameEn: "Webinar" } }),
    prisma.eventType.upsert({ where: { slug: "networking" }, update: {}, create: { slug: "networking", nameBg: "Нетуъркинг", nameEn: "Networking" } }),
    prisma.eventType.upsert({ where: { slug: "training" }, update: {}, create: { slug: "training", nameBg: "Обучение", nameEn: "Training" } }),
    prisma.eventType.upsert({ where: { slug: "masterclass" }, update: {}, create: { slug: "masterclass", nameBg: "Мастъркласс", nameEn: "Masterclass" } }),
    prisma.eventType.upsert({ where: { slug: "panel-discussion" }, update: {}, create: { slug: "panel-discussion", nameBg: "Панелна дискусия", nameEn: "Panel Discussion" } }),
    prisma.eventType.upsert({ where: { slug: "expo" }, update: {}, create: { slug: "expo", nameBg: "Изложение", nameEn: "Expo" } }),
    prisma.eventType.upsert({ where: { slug: "business-breakfast" }, update: {}, create: { slug: "business-breakfast", nameBg: "Бизнес закуска", nameEn: "Business Breakfast" } }),
  ]);
  console.log(`Seeded ${eventTypes.length} event types`);

  // Topics
  const topics = await Promise.all([
    prisma.topic.upsert({ where: { slug: "entrepreneurship" }, update: {}, create: { slug: "entrepreneurship", nameBg: "Предприемачество", nameEn: "Entrepreneurship" } }),
    prisma.topic.upsert({ where: { slug: "startups" }, update: {}, create: { slug: "startups", nameBg: "Стартъпи", nameEn: "Startups" } }),
    prisma.topic.upsert({ where: { slug: "ai" }, update: {}, create: { slug: "ai", nameBg: "Изкуствен интелект", nameEn: "AI" } }),
    prisma.topic.upsert({ where: { slug: "marketing" }, update: {}, create: { slug: "marketing", nameBg: "Маркетинг", nameEn: "Marketing" } }),
    prisma.topic.upsert({ where: { slug: "sales" }, update: {}, create: { slug: "sales", nameBg: "Продажби", nameEn: "Sales" } }),
    prisma.topic.upsert({ where: { slug: "finance" }, update: {}, create: { slug: "finance", nameBg: "Финанси", nameEn: "Finance" } }),
    prisma.topic.upsert({ where: { slug: "hr" }, update: {}, create: { slug: "hr", nameBg: "Човешки ресурси", nameEn: "HR" } }),
    prisma.topic.upsert({ where: { slug: "leadership" }, update: {}, create: { slug: "leadership", nameBg: "Лидерство", nameEn: "Leadership" } }),
    prisma.topic.upsert({ where: { slug: "agriculture" }, update: {}, create: { slug: "agriculture", nameBg: "Земеделие", nameEn: "Agriculture" } }),
    prisma.topic.upsert({ where: { slug: "tourism" }, update: {}, create: { slug: "tourism", nameBg: "Туризъм", nameEn: "Tourism" } }),
    prisma.topic.upsert({ where: { slug: "eu-funding" }, update: {}, create: { slug: "eu-funding", nameBg: "Европейско финансиране", nameEn: "EU Funding" } }),
  ]);
  console.log(`Seeded ${topics.length} topics`);

  // Tags
  const tags = await Promise.all([
    prisma.tag.upsert({ where: { slug: "networking" }, update: {}, create: { slug: "networking", nameBg: "нетуъркинг", nameEn: "networking" } }),
    prisma.tag.upsert({ where: { slug: "startup" }, update: {}, create: { slug: "startup", nameBg: "стартъп", nameEn: "startup" } }),
    prisma.tag.upsert({ where: { slug: "grants" }, update: {}, create: { slug: "grants", nameBg: "грантове", nameEn: "grants" } }),
    prisma.tag.upsert({ where: { slug: "agriculture" }, update: {}, create: { slug: "agriculture", nameBg: "земеделие", nameEn: "agriculture" } }),
    prisma.tag.upsert({ where: { slug: "sme" }, update: {}, create: { slug: "sme", nameBg: "МСП", nameEn: "SME" } }),
    prisma.tag.upsert({ where: { slug: "b2b" }, update: {}, create: { slug: "b2b", nameBg: "B2B", nameEn: "B2B" } }),
    prisma.tag.upsert({ where: { slug: "export" }, update: {}, create: { slug: "export", nameBg: "износ", nameEn: "export" } }),
    prisma.tag.upsert({ where: { slug: "ai" }, update: {}, create: { slug: "ai", nameBg: "AI", nameEn: "AI" } }),
    prisma.tag.upsert({ where: { slug: "rural-business" }, update: {}, create: { slug: "rural-business", nameBg: "бизнес в селото", nameEn: "rural business" } }),
  ]);
  console.log(`Seeded ${tags.length} tags`);

  // Admin user (for development only)
  const adminHash = await bcrypt.hash("admin1234", 12);
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { emailVerifiedAt: new Date() },
    create: {
      email: "admin@example.com",
      name: "Admin",
      passwordHash: adminHash,
      role: "ADMIN",
      emailVerifiedAt: new Date(),
    },
  });
  console.log("Seeded admin user (admin@example.com / admin1234)");

  // Sample events for development
  const admin = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
  const sofia = await prisma.city.findUnique({ where: { slug: "sofia" } });
  const online = await prisma.city.findUnique({ where: { slug: "online" } });
  const conference = await prisma.eventType.findUnique({ where: { slug: "conference" } });
  const workshop = await prisma.eventType.findUnique({ where: { slug: "workshop" } });
  const webinar = await prisma.eventType.findUnique({ where: { slug: "webinar" } });
  const aiTopic = await prisma.topic.findUnique({ where: { slug: "ai" } });
  const marketingTopic = await prisma.topic.findUnique({ where: { slug: "marketing" } });

  if (admin && sofia && online && conference && workshop && webinar) {
    await prisma.event.upsert({
      where: { slug: "ai-business-forum-sofia-2026" },
      update: {},
      create: {
        title: "AI Business Forum Sofia 2026",
        slug: "ai-business-forum-sofia-2026",
        shortDescription: "Годишен форум за изкуствен интелект и бизнес трансформация в България.",
        startAt: new Date("2026-07-15T09:00:00"),
        endAt: new Date("2026-07-15T18:00:00"),
        cityId: sofia.id,
        locationType: "PHYSICAL",
        eventTypeId: conference.id,
        priceType: "PAID",
        priceMin: 150,
        currency: "BGN",
        language: "BG",
        status: "PUBLISHED",
        createdById: admin.id,
        topics: { create: aiTopic ? [{ topicId: aiTopic.id }] : [] },
      },
    });

    await prisma.event.upsert({
      where: { slug: "digital-marketing-workshop-2026" },
      update: {},
      create: {
        title: "Дигитален маркетинг за малкия бизнес",
        slug: "digital-marketing-workshop-2026",
        shortDescription: "Практически уъркшоп за собственици на малък бизнес, които искат да подобрят онлайн присъствието си.",
        startAt: new Date("2026-07-22T10:00:00"),
        endAt: new Date("2026-07-22T14:00:00"),
        cityId: sofia.id,
        locationType: "PHYSICAL",
        eventTypeId: workshop.id,
        priceType: "FREE",
        language: "BG",
        status: "PUBLISHED",
        createdById: admin.id,
        topics: { create: marketingTopic ? [{ topicId: marketingTopic.id }] : [] },
      },
    });

    await prisma.event.upsert({
      where: { slug: "startup-webinar-funding-2026" },
      update: {},
      create: {
        title: "Как да финансираме стартъп — безплатен уебинар",
        slug: "startup-webinar-funding-2026",
        shortDescription: "Онлайн уебинар за начинаещи предприемачи относно EU грантове и ангелско финансиране.",
        startAt: new Date("2026-08-05T18:00:00"),
        endAt: new Date("2026-08-05T19:30:00"),
        cityId: online.id,
        locationType: "ONLINE",
        onlineUrl: "https://zoom.us/example",
        eventTypeId: webinar.id,
        priceType: "FREE",
        language: "BG",
        status: "PUBLISHED",
        createdById: admin.id,
      },
    });

    console.log("Seeded 3 sample events");
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
