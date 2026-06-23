import { crawlDevBgEventFromUrl } from "../src/crawlers/sources/devbg";

const url =
  "https://dev.bg/event/from-sumup-to-paypercut-a-founders-perspective-on-funding-deals-and-building-a-startup";

crawlDevBgEventFromUrl(url)
  .then((event) => {
    console.log(JSON.stringify(event, null, 2));
  })
  .catch(console.error);
