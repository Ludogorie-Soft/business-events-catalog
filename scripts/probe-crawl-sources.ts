async function probeStartupCouncil() {
  const res = await fetch("https://www.startupcouncil.org/events", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await res.text();
  const jsonMatch = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
  );
  if (jsonMatch) {
    const data = JSON.parse(jsonMatch[1]);
    console.log("ld+json type", data["@type"]);
    console.log(JSON.stringify(data, null, 2).slice(0, 2000));
  }

  const eventLinks = [...html.matchAll(/href="(\/events\/[^"]+)"/g)].map((m) => m[1]);
  console.log("event links", [...new Set(eventLinks)].slice(0, 10));

  const dateMatches = [...html.matchAll(/\*\*(\d{2}\/\d{2}\/\d{4})\*\* ([\d:]+\s*[AP]M)/g)];
  console.log("dates", dateMatches.slice(0, 5).map((m) => m[0]));
}

async function probeEventbrite() {
  const res = await fetch("https://www.eventbrite.com/d/online/all-events/", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await res.text();
  const jsonMatch = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
  );
  if (jsonMatch) {
    const data = JSON.parse(jsonMatch[1]);
    console.log("ld+json keys", Object.keys(data));
    if (Array.isArray(data)) console.log("array len", data.length);
    else console.log(JSON.stringify(data, null, 2).slice(0, 1500));
  }

  const links = [
    ...new Set(
      [...html.matchAll(/https:\/\/www\.eventbrite\.com\/e\/([^"?]+)/g)].map(
        (m) => `https://www.eventbrite.com/e/${m[1].split("?")[0]}`
      )
    ),
  ];
  console.log("unique event urls", links.length, links.slice(0, 5));

  // try to find title near link
  const titlePattern =
    /https:\/\/www\.eventbrite\.com\/e\/([^"?]+)[^"]*"[^>]*>[\s\S]{0,200}?>([^<]{5,120})</;
  const sample = html.match(titlePattern);
  console.log("title sample", sample?.[2]);
}

async function main() {
  console.log("=== startupcouncil detail ===");
  await probeStartupCouncil();
  console.log("\n=== eventbrite detail ===");
  await probeEventbrite();
}

main().catch(console.error);
