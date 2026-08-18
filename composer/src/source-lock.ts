export const SOURCE_LOCK_KINDS = ['anchor-program', 'external-program', 'relay'] as const;
export type SourceLockKind = (typeof SOURCE_LOCK_KINDS)[number];

export const SOURCE_LOCK_STATUSES = ['local-only', 'pinned', 'blocked'] as const;
export type SourceLockStatus = (typeof SOURCE_LOCK_STATUSES)[number];

export interface SourceLockEntry {
  name: string;
  kind: SourceLockKind;
  program_id?: string | null;
  endpoint?: string | null;
  idl_sha256?: string | null;
  status: SourceLockStatus;
  implementation_gate: string;
}

export interface SourceLock {
  lock_version: '1.0';
  generated_at_utc: string;
  entries: SourceLockEntry[];
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function lockEntryBlockers(entry: SourceLockEntry, index: number): string[] {
  const prefix = nonEmptyString(entry.name) ? entry.name : `entry-${index}`;
  const blockers: string[] = [];

  if (!nonEmptyString(entry.name)) blockers.push(`${prefix}: missing entry name`);
  if (!SOURCE_LOCK_KINDS.includes(entry.kind)) blockers.push(`${prefix}: unsupported source-lock kind`);
  if (!SOURCE_LOCK_STATUSES.includes(entry.status)) blockers.push(`${prefix}: unsupported source-lock status`);
  if (!nonEmptyString(entry.implementation_gate)) blockers.push(`${prefix}: missing implementation gate`);
  if (entry.status !== 'pinned') blockers.push(`${prefix}: ${entry.implementation_gate || 'dependency is not pinned'}`);

  if (entry.kind === 'anchor-program' || entry.kind === 'external-program') {
    if (!nonEmptyString(entry.program_id)) blockers.push(`${prefix}: missing program ID`);
    if (!nonEmptyString(entry.idl_sha256)) blockers.push(`${prefix}: missing immutable IDL hash`);
  }
  if (entry.kind === 'relay' && !nonEmptyString(entry.endpoint)) {
    blockers.push(`${prefix}: missing relay endpoint`);
  }

  return blockers;
}

export function sourceLockBlockers(
  lock: SourceLock,
  requiredEntryNames: readonly string[] = [],
): string[] {
  if (!Array.isArray(lock.entries) || lock.entries.length === 0) {
    return ['source-lock: at least one dependency entry is required'];
  }

  const blockers: string[] = [];
  const seenNames = new Set<string>();

  for (const [index, entry] of lock.entries.entries()) {
    blockers.push(...lockEntryBlockers(entry, index));
    if (nonEmptyString(entry.name)) {
      if (seenNames.has(entry.name)) blockers.push(`${entry.name}: duplicate source-lock entry`);
      seenNames.add(entry.name);
    }
  }

  for (const name of requiredEntryNames) {
    if (!seenNames.has(name)) blockers.push(`${name}: required source-lock entry is missing`);
  }

  return blockers;
}

export function sourceLockAllowsExecution(
  lock: SourceLock,
  requiredEntryNames: readonly string[] = [],
): boolean {
  return sourceLockBlockers(lock, requiredEntryNames).length === 0;
}
