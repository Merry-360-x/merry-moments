# Cloudinary Migration Runbook (Old -> New)

This runbook copies existing media from your old Cloudinary account to your new one with minimal risk.

## 1) Rotate exposed credentials first

If any Cloudinary API secret was shared, rotate both old/new API secrets before migration.

## 2) Set migration environment variables

Run in terminal (from project root):

```bash
export OLD_CLOUDINARY_CLOUD_NAME="<old_cloud_name>"
export OLD_CLOUDINARY_API_KEY="<old_api_key>"
export OLD_CLOUDINARY_API_SECRET="<old_api_secret>"

export NEW_CLOUDINARY_CLOUD_NAME="dghg9uebh"
export NEW_CLOUDINARY_API_KEY="<new_api_key>"
export NEW_CLOUDINARY_API_SECRET="<new_api_secret>"

# Optional controls
export MIGRATION_PAGE_SIZE=100
export MIGRATION_MAX_PAGES=0
export MIGRATION_RESOURCE_TYPES="image,video,raw"
# export MIGRATION_PREFIX="merry360x/"
```

Notes:
- `MIGRATION_MAX_PAGES=0` means "no page limit".
- Set `MIGRATION_PREFIX` to migrate a specific folder first.

## 3) Run the migration script

```bash
npm run migrate:cloudinary
```

The script is resumable and writes:
- State cursor: `tmp/cloudinary-migration-state.json`
- Report: `tmp/cloudinary-migration-report.json`

If interrupted, run again; it resumes from last cursor.

## 4) Verify copied assets

Check report summary in `tmp/cloudinary-migration-report.json`:
- `scanned`
- `copied`
- `skippedExisting`
- `failed`

Run script again until failures are minimized (or resolved).

## 5) Update DB URLs (only after copy is complete)

Replace old cloud name in all stored URLs inside your DB data.

Use SQL in Supabase SQL editor (example pattern):

```sql
-- Example for simple text URL columns
update profiles
set avatar_url = replace(avatar_url, 'res.cloudinary.com/<old_cloud>', 'res.cloudinary.com/dghg9uebh')
where avatar_url like '%res.cloudinary.com/<old_cloud>%';
```

For array/json columns, use table-specific SQL updates carefully (test in staging first).

## 6) Cutover & monitor

1. Verify random pages and listings on production.
2. Keep old account active as fallback for 3-7 days.
3. After no broken media appears, retire old account usage.

## Safety checklist

- [ ] Secrets rotated
- [ ] All assets copied (or accounted for)
- [ ] DB URLs updated
- [ ] Production spot-check complete
- [ ] Old account kept as temporary fallback
