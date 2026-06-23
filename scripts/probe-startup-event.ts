async function main() {
  const res = await fetch("https://www.startupcouncil.org/events", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await res.text();
  const idx = html.indexOf("startup-spotlight-2026");
  console.log(html.slice(Math.max(0, idx - 400), idx + 1500));
}

main().catch(console.error);
