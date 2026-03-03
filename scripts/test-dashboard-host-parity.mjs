import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const read = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const appTsx = read("src/App.tsx");
const becomeHostWeb = read("src/pages/BecomeHost.tsx");
const hostDashboardWeb = read("src/pages/HostDashboard.tsx");
const mobileHostApi = read("merry360x_mobile/shared-js/src/api/host.js");
const mobileProfileApi = read("merry360x_mobile/shared-js/src/api/profile.js");

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function hasRouteLiteral(route) {
  return appTsx.includes(`path=\"${route}\"`);
}

function hasInFile(fileText, needle) {
  return fileText.includes(needle);
}

function objectBlock(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) return "";

  const braceStart = source.indexOf("{", start);
  if (braceStart < 0) return "";

  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    const char = source[i];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(braceStart, i + 1);
      }
    }
  }

  return "";
}

function keysFromObjectLiteral(objectText) {
  const keys = new Set();
  const keyRegex = /(^|\n)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
  let match = keyRegex.exec(objectText);
  while (match) {
    keys.add(match[2]);
    match = keyRegex.exec(objectText);
  }
  return keys;
}

const requiredDashboardRoutes = [
  "/admin",
  "/customer-support-dashboard",
  "/financial-dashboard",
  "/host-dashboard",
  "/become-host",
  "/support-dashboard",
];

for (const route of requiredDashboardRoutes) {
  assert(hasRouteLiteral(route), `Missing required route in web app: ${route}`);
}

assert(
  hasInFile(appTsx, 'path="/support-dashboard" element={<Navigate to="/customer-support-dashboard" replace />}'),
  "Legacy support dashboard redirect is missing or changed"
);

const webBecomeHostPayload = objectBlock(becomeHostWeb, "const payload");
const mobileBecomeHostPayload = objectBlock(mobileProfileApi, "const applicationPayload");

const webBecomeHostKeys = keysFromObjectLiteral(webBecomeHostPayload);
const mobileBecomeHostKeys = keysFromObjectLiteral(mobileBecomeHostPayload);

for (const key of webBecomeHostKeys) {
  assert(
    mobileBecomeHostKeys.has(key),
    `Mobile becomeHost payload missing key used by website: ${key}`
  );
}

const mobileCreatePropertyPayload = objectBlock(mobileHostApi, "const normalizedPayload");
const mobileCreatePropertyKeys = keysFromObjectLiteral(mobileCreatePropertyPayload);

const requiredListingKeys = [
  "host_id",
  "name",
  "title",
  "location",
  "property_type",
  "description",
  "price_per_night",
  "price_per_month",
  "price_per_person",
  "price_per_group",
  "price_per_group_size",
  "currency",
  "max_guests",
  "bedrooms",
  "bathrooms",
  "beds",
  "amenities",
  "images",
  "main_image",
  "is_published",
  "weekly_discount",
  "monthly_discount",
  "available_for_monthly_rental",
  "monthly_only_listing",
  "check_in_time",
  "check_out_time",
  "smoking_allowed",
  "events_allowed",
  "pets_allowed",
  "conference_room_capacity",
  "conference_room_min_rooms_required",
  "conference_room_equipment",
  "conference_room_price",
  "conference_room_duration_hours",
];

for (const key of requiredListingKeys) {
  assert(
    mobileCreatePropertyKeys.has(key),
    `Mobile createProperty payload missing required listing key: ${key}`
  );
}

assert(
  hasInFile(hostDashboardWeb, 'supabase.from("properties").insert(payload)'),
  "Website listing creation insert flow changed: expected properties insert payload call"
);
assert(
  hasInFile(mobileHostApi, ".from('properties')") && hasInFile(mobileHostApi, ".insert(normalizedPayload)"),
  "Mobile listing creation should insert into properties with normalizedPayload"
);
assert(
  hasInFile(becomeHostWeb, '.from("host_applications").insert(payload') && hasInFile(becomeHostWeb, 'rpc("become_host")'),
  "Website become-host flow should create host_applications record and call become_host RPC"
);
assert(
  hasInFile(mobileProfileApi, ".from('host_applications')") && hasInFile(mobileProfileApi, ".insert(applicationPayload)") && hasInFile(mobileProfileApi, "rpc('become_host')"),
  "Mobile becomeHost flow should create host_applications record and call become_host RPC"
);

if (failures.length > 0) {
  console.error("\n❌ Dashboard/Host parity checks failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("✅ Dashboard/Host parity checks passed.");
