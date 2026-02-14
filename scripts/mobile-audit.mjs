import { chromium, devices } from 'playwright';

const baseUrl = 'https://merry360x.com';
const iPhone = devices['iPhone 12'];

const routes = [
  '/',
  '/trip-cart',
  '/checkout',
  '/checkout?mode=booking&propertyId=demo&checkIn=2026-02-20&checkOut=2026-02-21',
  '/host-dashboard',
  '/my-bookings',
  '/help-center',
];

function summarizeLayout(result) {
  const overflowX = result.scrollWidth > result.clientWidth + 1;
  return {
    overflowX,
    scrollWidth: result.scrollWidth,
    clientWidth: result.clientWidth,
    canScrollY: result.scrollHeight > result.clientHeight + 1,
    scrollHeight: result.scrollHeight,
    clientHeight: result.clientHeight,
    blockedFixedCount: (result.fixedElements || []).length,
  };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...iPhone });
  const page = await context.newPage();

  const report = [];

  for (const route of routes) {
    const url = `${baseUrl}${route}`;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(1200);

      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        const scrollEl = document.scrollingElement || doc;

        const fixedElements = Array.from(document.querySelectorAll('*'))
          .filter((el) => {
            const style = window.getComputedStyle(el);
            if (style.position !== 'fixed') return false;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            return rect.width > window.innerWidth * 0.9 && rect.height > 80;
          })
          .map((el) => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return {
              tag: el.tagName.toLowerCase(),
              cls: (el.className || '').toString().slice(0, 80),
              top: rect.top,
              bottom: rect.bottom,
              zIndex: style.zIndex,
              pointerEvents: style.pointerEvents,
            };
          });

        return {
          title: document.title,
          clientWidth: doc.clientWidth,
          scrollWidth: Math.max(doc.scrollWidth, body?.scrollWidth || 0),
          clientHeight: doc.clientHeight,
          scrollHeight: Math.max(doc.scrollHeight, body?.scrollHeight || 0),
          fixedElements,
          scrollTopBefore: scrollEl.scrollTop,
        };
      });

      await page.evaluate(() => {
        const scrollEl = document.scrollingElement || document.documentElement;
        scrollEl.scrollTo({ top: Math.max(200, scrollEl.scrollHeight / 2), behavior: 'auto' });
      });
      await page.waitForTimeout(300);
      const scrollTopAfter = await page.evaluate(() => {
        const scrollEl = document.scrollingElement || document.documentElement;
        return scrollEl.scrollTop;
      });

      report.push({
        route,
        url,
        ...summarizeLayout(metrics),
        scrollTopAfter,
        fixedElements: metrics.fixedElements,
        title: metrics.title,
      });
    } catch (error) {
      report.push({
        route,
        url,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await browser.close();

  const failing = report.filter((r) => r.error || r.overflowX || (r.canScrollY && (!r.scrollTopAfter || r.scrollTopAfter < 10)));

  console.log('\n=== MOBILE AUDIT REPORT ===');
  for (const r of report) {
    if (r.error) {
      console.log(`\n[${r.route}] ERROR: ${r.error}`);
      continue;
    }
    console.log(`\n[${r.route}] ${r.title || ''}`);
    console.log(`overflowX=${r.overflowX} width=${r.clientWidth}/${r.scrollWidth}`);
    console.log(`canScrollY=${r.canScrollY} height=${r.clientHeight}/${r.scrollHeight} scrollTopAfter=${r.scrollTopAfter}`);
    console.log(`largeFixedLayers=${r.blockedFixedCount}`);
  }

  console.log('\n=== SUMMARY ===');
  if (failing.length === 0) {
    console.log('PASS: no overflow/scroll blockers detected');
  } else {
    console.log(`ISSUES: ${failing.length} route(s) need attention`);
    for (const f of failing) console.log(`- ${f.route}`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
