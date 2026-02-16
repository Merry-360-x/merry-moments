import { v2 as cloudinary } from "cloudinary";
import fs from "node:fs/promises";
import path from "node:path";

const required = [
  "OLD_CLOUDINARY_CLOUD_NAME",
  "OLD_CLOUDINARY_API_KEY",
  "OLD_CLOUDINARY_API_SECRET",
  "NEW_CLOUDINARY_CLOUD_NAME",
  "NEW_CLOUDINARY_API_KEY",
  "NEW_CLOUDINARY_API_SECRET",
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error("Missing required environment variables:", missing.join(", "));
  process.exit(1);
}

const oldConfig = {
  cloud_name: process.env.OLD_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.OLD_CLOUDINARY_API_KEY,
  api_secret: process.env.OLD_CLOUDINARY_API_SECRET,
  secure: true,
};

const newConfig = {
  cloud_name: process.env.NEW_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEW_CLOUDINARY_API_KEY,
  api_secret: process.env.NEW_CLOUDINARY_API_SECRET,
  secure: true,
};

const pageSize = Math.max(1, Math.min(500, Number(process.env.MIGRATION_PAGE_SIZE || 100)));
const maxPagesPerRun = Math.max(0, Number(process.env.MIGRATION_MAX_PAGES || 0));
const prefix = String(process.env.MIGRATION_PREFIX || "").trim() || undefined;
const stateFile = process.env.MIGRATION_STATE_FILE || "tmp/cloudinary-migration-state.json";
const reportFile = process.env.MIGRATION_REPORT_FILE || "tmp/cloudinary-migration-report.json";
const resourceTypes = String(process.env.MIGRATION_RESOURCE_TYPES || "image,video,raw")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const stats = {
  scanned: 0,
  copied: 0,
  skippedExisting: 0,
  skippedNoUrl: 0,
  failed: 0,
};

const failures = [];

function configureCloudinary(config) {
  cloudinary.config(config);
}

function isAlreadyExistsError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("already exists") || message.includes("conflict");
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry(operation, label, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const shouldRetry = attempt < attempts;
      if (!shouldRetry) break;
      const backoffMs = 300 * attempt;
      console.warn(`[retry] ${label} failed (attempt ${attempt}/${attempts}), retrying in ${backoffMs}ms`);
      await wait(backoffMs);
    }
  }
  throw lastError;
}

async function ensureParentDir(filePath) {
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });
}

async function readJsonSafe(filePath, fallbackValue) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch {
    return fallbackValue;
  }
}

async function writeJson(filePath, value) {
  await ensureParentDir(filePath);
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function listResourcesPage(resourceType, cursor) {
  configureCloudinary(oldConfig);

  return retry(
    () =>
      cloudinary.api.resources({
        resource_type: resourceType,
        type: "upload",
        max_results: pageSize,
        next_cursor: cursor || undefined,
        prefix,
      }),
    `list ${resourceType} page`
  );
}

async function copyResource(resource, resourceType) {
  if (!resource?.secure_url) {
    stats.skippedNoUrl += 1;
    return;
  }

  const sourceResourceType = resourceType;
  const targetResourceType = resourceType;
  const sourceUrl = resource.secure_url;

  configureCloudinary(newConfig);

  const uploadFromSource = (url) =>
    cloudinary.uploader.upload(url, {
      resource_type: targetResourceType,
      type: "upload",
      public_id: resource.public_id,
      overwrite: false,
      use_filename: false,
      unique_filename: false,
    });

  try {
    await retry(
      () => uploadFromSource(sourceUrl),
      `copy ${resourceType}:${resource.public_id}`
    );
  } catch (error) {
    const message = String(error?.message || error || "");
    const isUnauthorized = message.includes("401") || message.toLowerCase().includes("unauthorized");

    if (!isUnauthorized) throw error;

    // Fallback for restricted assets (commonly PDFs): generate a signed short-lived download URL.
    configureCloudinary(oldConfig);
    const expiresAt = Math.floor(Date.now() / 1000) + 600;
    const signedDownloadUrl = cloudinary.utils.private_download_url(
      resource.public_id,
      String(resource?.format || "").toLowerCase() || undefined,
      {
        resource_type: sourceResourceType,
        type: "upload",
        expires_at: expiresAt,
      }
    );

    configureCloudinary(newConfig);
    await retry(
      () => uploadFromSource(signedDownloadUrl),
      `copy-signed ${resourceType}:${resource.public_id}`
    );
  }
}

async function migrateResourceType(resourceType, state) {
  let nextCursor = state?.cursors?.[resourceType] || null;
  let pagesProcessed = 0;

  console.log(`\n[migrate] Starting ${resourceType} (cursor: ${nextCursor || "beginning"})`);

  while (true) {
    if (maxPagesPerRun > 0 && pagesProcessed >= maxPagesPerRun) {
      console.log(`[migrate] Reached MIGRATION_MAX_PAGES=${maxPagesPerRun} for ${resourceType}`);
      break;
    }

    const page = await listResourcesPage(resourceType, nextCursor);
    const resources = Array.isArray(page?.resources) ? page.resources : [];
    pagesProcessed += 1;

    console.log(`[migrate] ${resourceType} page ${pagesProcessed}: ${resources.length} assets`);

    for (const resource of resources) {
      stats.scanned += 1;

      try {
        await copyResource(resource, resourceType);
        stats.copied += 1;
      } catch (error) {
        if (isAlreadyExistsError(error)) {
          stats.skippedExisting += 1;
        } else {
          stats.failed += 1;
          const failure = {
            resourceType,
            publicId: resource?.public_id,
            message: String(error?.message || error),
          };
          if (failures.length < 200) failures.push(failure);
          console.error(`[error] Failed ${resourceType}:${resource?.public_id} -> ${failure.message}`);
        }
      }
    }

    nextCursor = page?.next_cursor || null;
    state.cursors[resourceType] = nextCursor;
    state.updatedAt = new Date().toISOString();
    await writeJson(stateFile, state);

    if (!nextCursor) {
      console.log(`[migrate] Completed ${resourceType}`);
      break;
    }
  }
}

async function main() {
  const state = await readJsonSafe(stateFile, {
    cursors: {},
    updatedAt: null,
  });

  for (const resourceType of resourceTypes) {
    await migrateResourceType(resourceType, state);
  }

  const report = {
    startedAt: state.startedAt || new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    oldCloud: oldConfig.cloud_name,
    newCloud: newConfig.cloud_name,
    resourceTypes,
    pageSize,
    maxPagesPerRun,
    prefix: prefix || null,
    stateFile,
    stats,
    failures,
  };

  await writeJson(reportFile, report);

  console.log("\nMigration finished.");
  console.log(JSON.stringify({ stats, reportFile, stateFile }, null, 2));
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
