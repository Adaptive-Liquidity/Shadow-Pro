export type SourceLockStatus = 'local-only' | 'pinned' | 'blocked';

export interface SourceLockEntry {
  name: string;
  kind: string;
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

export function sourceLockAllowsExecution(lock: SourceLock): boolean {
  return lock.entries.length > 0 && lock.entries.every((entry) => {
    if (entry.status !== 'pinned') return false;
    if (entry.kind === 'external-program' && (!entry.program_id || !entry.idl_sha256)) return false;
    if (entry.kind === 'relay' && !entry.endpoint) return false;
    return true;
  });
}

export function sourceLockBlockers(lock: SourceLock): string[] {
  return lock.entries
    .filter((entry) => {
      if (entry.status !== 'pinned') return true;
      if (entry.kind === 'external-program') return !entry.program_id || !entry.idl_sha256;
      if (entry.kind === 'relay') return !entry.endpoint;
      return false;
    })
    .map((entry) => `${entry.name}: ${entry.implementation_gate}`);
}
