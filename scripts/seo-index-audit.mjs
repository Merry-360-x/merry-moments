#!/usr/bin/env node

const DEFAULT_BASE_URL = "https://merry360x.com";
const DEFAULT_PATHS = [
  "/",
  "/accommodations",
  "/tours",
  "/transport",
  "/contact",
];

function parseArgs(argv) {
  const args = { baseUrl: DEFAULT_BASE_URL, paths: DEFAULT_PATHS, strictCanonical: false };

  for (const arg of argv) {
    if (arg.startsWith("--base=")) {
      args.baseUrl = arg.slice("--base=".length).trim();
    }
    if (arg.startsWith("--paths=")) {
      const raw = arg.slice("--paths=".length).trim();
      const list = raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => (item.startsWith("/") ? item : `/${item}`));
      if (list.length > 0) {
        args.paths = list;
      }
    }
    if (arg === "--strict-canonical") {
      args.strictCanonical = true;
    }
  }

  return args;
}

function toAbsolute(baseUrl, path) {
  return new URL(path, baseUrl).toString();
}

function extractMetaRobots(html) {
  const match = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  return match?.[1]?.toLowerCase() ?? "";
}

function extractCanonical(html) {
  const match = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  return match?.[1] ?? "";
}

function hasSitemapInRobots(text, expectedSitemapUrl) {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  return lines.some((line) => {
    if (!line.toLowerCase().startsWith("sitemap:")) return false;
    const value = line.slice("sitemap:".length).trim();
    return value === expectedSitemapUrl;
  });
}

function parseSitemapLocs(xml) {
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)];
  return matches.map((m) => m[1].trim()).filter(Boolean);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "MerryMoments-SEO-Audit/1.0",
      Accept: "text/html,application/xml,text/plain,*/*",
    },
    redirect: "follow",
  });

  const text = await response.text();
  return { response, text };
}

async function run() {
  const { baseUrl, paths, strictCanonical } = parseArgs(process.argv.slice(2));
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  const checks = [];
  let failed = 0;

  const sitemapUrl = toAbsolute(normalizedBase, "/sitemap.xml");
  const robotsUrl = toAbsolute(normalizedBase, "/robots.txt");

  try {
    const { response, text } = await fetchText(robotsUrl);
    const ok = response.ok && hasSitemapInRobots(text, sitemapUrl);
    checks.push({
      name: "robots.txt has sitemap",
      ok,
      details: `status=${response.status} url=${robotsUrl}`,
    });
    if (!ok) failed += 1;
  } catch (error) {
    checks.push({
      name: "robots.txt has sitemap",
      ok: false,
      details: `error=${error.message}`,
    });
    failed += 1;
  }

  let sitemapLocs = [];
  try {
    const { response, text } = await fetchText(sitemapUrl);
    sitemapLocs = parseSitemapLocs(text);
    const ok = response.ok && sitemapLocs.length > 0;
    checks.push({
      name: "sitemap.xml is reachable",
      ok,
      details: `status=${response.status} urlCount=${sitemapLocs.length}`,
    });
    if (!ok) failed += 1;
  } catch (error) {
    checks.push({
      name: "sitemap.xml is reachable",
      ok: false,
      details: `error=${error.message}`,
    });
    failed += 1;
  }

  for (const path of paths) {
    const pageUrl = toAbsolute(normalizedBase, path);

    try {
      const { response, text } = await fetchText(pageUrl);
      const robotsMeta = extractMetaRobots(text);
      const canonical = extractCanonical(text);
      const expectedCanonical = pageUrl;
      const isSpaShell = text.includes("<div id=\"root\"></div>") || text.includes("<div id='root'></div>");
      const isHomeCanonical = canonical === toAbsolute(normalizedBase, "/");
      const spaCanonicalLikely = path !== "/" && isSpaShell && isHomeCanonical;
      const canonicalOk = canonical === expectedCanonical || (!strictCanonical && spaCanonicalLikely);
      const indexable = !robotsMeta.includes("noindex");
      const statusOk = response.ok;
      const inSitemap = sitemapLocs.includes(pageUrl);

      checks.push({
        name: `${path} status 200`,
        ok: statusOk,
        details: `status=${response.status}`,
      });
      checks.push({
        name: `${path} canonical matches`,
        ok: canonicalOk,
        details: canonical
          ? spaCanonicalLikely && !strictCanonical
            ? `canonical=${canonical} (spa-shell fallback accepted)`
            : `canonical=${canonical}`
          : "canonical=missing",
      });
      checks.push({
        name: `${path} is indexable`,
        ok: indexable,
        details: robotsMeta ? `robots=${robotsMeta}` : "robots=missing",
      });
      checks.push({
        name: `${path} present in sitemap`,
        ok: inSitemap,
        details: `url=${pageUrl}`,
      });

      if (!statusOk) failed += 1;
      if (!canonicalOk) failed += 1;
      if (!indexable) failed += 1;
      if (!inSitemap) failed += 1;
    } catch (error) {
      checks.push({
        name: `${path} page checks`,
        ok: false,
        details: `error=${error.message}`,
      });
      failed += 1;
    }
  }

  const passed = checks.length - failed;
  for (const check of checks) {
    const symbol = check.ok ? "✅" : "❌";
    console.log(`${symbol} ${check.name} (${check.details})`);
  }

  console.log("-");
  console.log(`Summary: ${passed}/${checks.length} checks passed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
