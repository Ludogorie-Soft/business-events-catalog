import "dotenv/config";
import { filterUpcomingEvents } from "../src/crawlers/filter-events";
import { enoCrawler } from "../src/crawlers/sources/entrepreneursnightout";
import { eventbriteCrawler } from "../src/crawlers/sources/eventbrite";
import { iecCrawler } from "../src/crawlers/sources/iec";
import { sofiaTechCrawler } from "../src/crawlers/sources/sofiatech";
import { startupCouncilCrawler } from "../src/crawlers/sources/startupcouncil";

async function main() {
  const eventbrite = filterUpcomingEvents(await eventbriteCrawler.crawl());
  console.log("Eventbrite upcoming events:", eventbrite.length);
  console.log(eventbrite.slice(0, 2));

  const iec = filterUpcomingEvents(await iecCrawler.crawl());
  console.log("IEC upcoming events:", iec.length);
  console.log(iec.slice(0, 2));

  const eno = filterUpcomingEvents(await enoCrawler.crawl());
  console.log("ENO upcoming events:", eno.length);
  console.log(eno);

  const sofiaTech = filterUpcomingEvents(await sofiaTechCrawler.crawl());
  console.log("Sofia Tech Park upcoming events:", sofiaTech.length);
  console.log(sofiaTech);

  const startupCouncil = filterUpcomingEvents(await startupCouncilCrawler.crawl());
  console.log("Startup Council events:", startupCouncil.length);
  console.log(startupCouncil.slice(0, 2));
}

main().catch(console.error);
