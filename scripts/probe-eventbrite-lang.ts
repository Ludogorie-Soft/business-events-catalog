async function main() {
  const res = await fetch("https://www.eventbrite.com/d/online/business--events/", {
    headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en-US,en;q=0.9" },
  });
  const html = await res.text();
  const idx = html.indexOf('"language":"en-us"');
  console.log(html.slice(idx - 100, idx + 600));
}

main().catch(console.error);
