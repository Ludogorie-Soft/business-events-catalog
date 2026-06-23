import "dotenv/config";
import { runCrawlEvents } from "../src/cron/crawl-events";
import { prisma } from "../src/lib/prisma";

async function main() {
  const sourceKey = process.argv[2];
  const result = await runCrawlEvents(sourceKey);
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
