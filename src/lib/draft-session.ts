const DRAFT_STEP_RESTORE_WINDOW_MS = 5 * 60 * 1000;

function clampStep(step: number, totalSteps: number): number {
  return Math.max(1, Math.min(totalSteps, Math.floor(step)));
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getDraftWizardStep(
  savedStep: unknown,
  totalSteps: number,
  timestamp: unknown,
): number {
  const numericStep = Number(savedStep);
  if (!Number.isFinite(numericStep)) return 1;

  const parsedTimestamp = parseTimestamp(timestamp);
  if (parsedTimestamp === null) return 1;

  const ageMs = Date.now() - parsedTimestamp;
  if (ageMs < 0 || ageMs > DRAFT_STEP_RESTORE_WINDOW_MS) {
    return 1;
  }

  return clampStep(numericStep, totalSteps);
}
