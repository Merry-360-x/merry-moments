import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";
import { config as dotenvConfig } from "dotenv";
import fs from "node:fs/promises";

dotenvConfig({ path: process.env.AUDIT_ENV_FILE || ".env.audit.local" });

const OLD_CLOUD_NAME = process.env.OLD_CLOUDINARY_CLOUD_NAME;
const OLD_API_KEY = process.env.OLD_CLOUDINARY_API_KEY;
const OLD_API_SECRET = process.env.OLD_CLOUDINARY_API_SECRET;
const NEW_CLOUD_NAME = process.env.NEW_CLOUDINARY_CLOUD_NAME;
const NEW_API_KEY = process.env.NEW_CLOUDINARY_API_KEY;
const NEW_API_SECRET = process.env.NEW_CLOUDINARY_API_SECRET;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const required = [
  ["OLD_CLOUDINARY_CLOUD_NAME", OLD_CLOUD_NAME],
  ["OLD_CLOUDINARY_API_KEY", OLD_API_KEY],
  ["OLD_CLOUDINARY_API_SECRET", OLD_API_SECRET],
  ["NEW_CLOUDINARY_CLOUD_NAME", NEW_CLOUD_NAME],
  ["NEW_CLOUDINARY_API_KEY", NEW_API_KEY],
  ["NEW_CLOUDINARY_API_SECRET", NEW_API_SECRET],
  ["SUPABASE_URL or VITE_SUPABASE_URL", SUPABASE_URL],
  ["SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY],
].filter(([, value]) => !value);

if (required.length) {
  console.error("Missing required env vars:", required.map(([name]) => name).join(", "));
  process.exit(1);
}

const oldDomain = `res.cloudinary.com/${OLD_CLOUD_NAME}`;
const newDomain = `res.cloudinary.com/${NEW_CLOUD_NAME}`;
const resourceTypes = (process.env.AUDIT_RESOURCE_TYPES || "image,video,raw")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const tableColumnChecks = [
  { table: "profiles", columns: ["avatar_url"] },
  { table: "properties", columns: ["images"] },
  { table: "tours", columns: ["image_url", "media"] },
  { table: "tour_packages", columns: ["image_url", "gallery_images", "media"] },
  { table: "transport_vehicles", columns: ["image_url", "interior_images", "exterior_images"] },
  { table: "stories", columns: ["media_url", "image_url"] },
  { table: "host_applications", columns: ["image_url", "media", "tour_package_data"] },
  { table: "reviews", columns: ["images"] },
  { table: "support_tickets", columns: ["attachments"] },
  { table: "checkout_requests", columns: ["items"] },
];

function configureCloudinary(cloudName, apiKey, apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

async function listPublicIdsForAccount({ cloudName, apiKey, apiSecret, label }) {
  configureCloudinary(cloudName, apiKey, apiSecret);

  const publicIds = new Set();
  const counts = {};

  for (const resourceType of resourceTypes) {
    let nextCursor;
    let scanned = 0;

    do {
      const page = await cloudinary.api.resources({
        resource_type: resourceType,
        type: "upload",
        max_results: 500,
        next_cursor: nextCursor,
      });

      const resources = Array.isArray(page?.resources) ? page.resources : [];
      scanned += resources.length;

      for (const resource of resources) {
        const key = `${resourceType}:${resource.public_id}`;
        publicIds.add(key);
      }

      nextCursor = page?.next_cursor;
    } while (nextCursor);

    counts[resourceType] = scanned;
    console.log(`[audit] ${label} ${resourceType}: ${scanned}`);
  }

  return { publicIds, counts };
}

function collectStrings(value, sink = []) {
  if (value == null) return sink;
  if (typeof value === "string") {
    sink.push(value);
    return sink;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectStrings(entry, sink);
    return sink;
  }
  if (typeof value === "object") {
    for (const entry of Object.values(value)) collectStrings(entry, sink);
  }
  return sink;
}

async function auditDatabaseReferences() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results = [];

  for (const check of tableColumnChecks) {
    const { table, columns } = check;
    const selector = `id, ${columns.join(", ")}`;

    let oldCount = 0;
    let newCount = 0;
    const samplesOld = [];
    const samplesNew = [];

    let from = 0;
    const pageSize = 1000;
    let tableRows = 0;

    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select(selector)
        .range(from, from + pageSize - 1);

      if (error) {
        results.push({ table, columns, error: error.message, rowsScanned: tableRows, oldCount, newCount });
        break;
      }

      const rows = Array.isArray(data) ? data : [];
      tableRows += rows.length;

      for (const row of rows) {
        for (const column of columns) {
          const strings = collectStrings(row?.[column]);
          for (const text of strings) {
            if (text.includes(oldDomain)) {
              oldCount += 1;
              if (samplesOld.length < 5) samplesOld.push({ id: row?.id, column, value: text.slice(0, 180) });
            }
            if (text.includes(newDomain)) {
              newCount += 1;
              if (samplesNew.length < 5) samplesNew.push({ id: row?.id, column, value: text.slice(0, 180) });
            }
          }
        }
      }

      if (rows.length < pageSize) {
        results.push({ table, columns, rowsScanned: tableRows, oldCount, newCount, samplesOld, samplesNew });
        break;
      }

      from += pageSize;
    }
  }

  return results;
}

async function main() {
  console.log("[audit] Comparing Cloudinary assets...");
  const oldAccount = await listPublicIdsForAccount({
    cloudName: OLD_CLOUD_NAME,
    apiKey: OLD_API_KEY,
    apiSecret: OLD_API_SECRET,
    label: "old",
  });
  const newAccount = await listPublicIdsForAccount({
    cloudName: NEW_CLOUD_NAME,
    apiKey: NEW_API_KEY,
    apiSecret: NEW_API_SECRET,
    label: "new",
  });

  const missingInNew = [];
  for (const key of oldAccount.publicIds) {
    if (!newAccount.publicIds.has(key)) {
      missingInNew.push(key);
      if (missingInNew.length >= 200) break;
    }
  }

  console.log("[audit] Scanning database references...");
  const db = await auditDatabaseReferences();

  const report = {
    generatedAt: new Date().toISOString(),
    cloudinary: {
      oldCloud: OLD_CLOUD_NAME,
      newCloud: NEW_CLOUD_NAME,
      resourceTypes,
      oldCounts: oldAccount.counts,
      newCounts: newAccount.counts,
      oldTotal: oldAccount.publicIds.size,
      newTotal: newAccount.publicIds.size,
      missingInNewSample: missingInNew,
      missingInNewSampleCount: missingInNew.length,
      exactMatch: oldAccount.publicIds.size === newAccount.publicIds.size && missingInNew.length === 0,
    },
    database: {
      oldDomain,
      newDomain,
      tableChecks: db,
      totalOldRefs: db.reduce((sum, table) => sum + (table.oldCount || 0), 0),
      totalNewRefs: db.reduce((sum, table) => sum + (table.newCount || 0), 0),
    },
  };

  await fs.mkdir("tmp", { recursive: true });
  await fs.writeFile("tmp/media-migration-audit-report.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("\n[audit] Done.");
  console.log(JSON.stringify({
    cloudinary: {
      oldTotal: report.cloudinary.oldTotal,
      newTotal: report.cloudinary.newTotal,
      exactMatch: report.cloudinary.exactMatch,
      missingInNewSampleCount: report.cloudinary.missingInNewSampleCount,
    },
    database: {
      totalOldRefs: report.database.totalOldRefs,
      totalNewRefs: report.database.totalNewRefs,
    },
    reportFile: "tmp/media-migration-audit-report.json",
  }, null, 2));
}

main().catch((error) => {
  console.error("Audit failed:", error);
  process.exit(1);
});
