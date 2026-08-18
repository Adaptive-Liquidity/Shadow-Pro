import { readFile } from 'node:fs/promises';

const raw = await readFile(new URL('../config/sources.lock.json', import.meta.url), 'utf8');
const lock = JSON.parse(raw);
const allowedKinds = new Set(['anchor-program', 'external-program', 'relay']);
const allowedStatuses = new Set(['local-only', 'pinned', 'blocked']);

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

if (lock.lock_version !== '1.0' || !Array.isArray(lock.entries) || lock.entries.length === 0) {
  throw new Error('Invalid source lock structure.');
}

const names = new Set();
for (const entry of lock.entries) {
  if (!nonEmptyString(entry.name)) throw new Error('Source-lock entries require non-empty names.');
  if (names.has(entry.name)) throw new Error(`Duplicate source-lock entry: ${entry.name}.`);
  names.add(entry.name);
  if (!allowedKinds.has(entry.kind)) throw new Error(`Invalid source-lock kind for ${entry.name}.`);
  if (!allowedStatuses.has(entry.status)) throw new Error(`Invalid source-lock status for ${entry.name}.`);
  if (!nonEmptyString(entry.implementation_gate)) throw new Error(`Missing implementation gate for ${entry.name}.`);

  if (entry.status === 'pinned') {
    if ((entry.kind === 'anchor-program' || entry.kind === 'external-program')
      && (!nonEmptyString(entry.program_id) || !nonEmptyString(entry.idl_sha256))) {
      throw new Error(`Pinned program ${entry.name} lacks immutable program ID or IDL hash.`);
    }
    if (entry.kind === 'relay' && !nonEmptyString(entry.endpoint)) {
      throw new Error(`Pinned relay ${entry.name} lacks endpoint evidence.`);
    }
  }
}

const liveDependencies = lock.entries.filter((entry) => entry.kind === 'external-program' || entry.kind === 'relay');
const executable = liveDependencies.length > 0 && liveDependencies.every((entry) => entry.status === 'pinned');
if (executable) {
  throw new Error('Execution dependencies are fully pinned. Require a reviewed release-specific CI policy before enabling this state.');
}

console.log('Source lock is valid and execution remains fail-closed.');
