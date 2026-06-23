import "dotenv/config";
import { eventbriteCrawler } from "../src/crawlers/sources/eventbrite";
import { startupCouncilCrawler } from "../src/crawlers/sources/startupcouncil";

async function main() {
  const eventbrite = await eventbriteCrawler.crawl();
  console.log("Eventbrite events:", eventbrite.length);
  console.log(eventbrite.slice(0, 2));

  const startupCouncil = await startupCouncilCrawler.crawl();
  console.log("Startup Council events:", startupCouncil.length);
  console.log(startupCouncil);
}

main().catch(console.error);
