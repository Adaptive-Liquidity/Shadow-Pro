import { readFile } from 'node:fs/promises';

const raw = await readFile(new URL('../config/sources.lock.json', import.meta.url), 'utf8');
const lock = JSON.parse(raw);

if (lock.lock_version !== '1.0' || !Array.isArray(lock.entries) || lock.entries.length === 0) {
  throw new Error('Invalid source lock structure.');
}

for (const entry of lock.entries) {
  if (!['local-only', 'pinned', 'blocked'].includes(entry.status)) {
    throw new Error(`Invalid source-lock status for ${entry.name}.`);
  }
  if (entry.status === 'pinned') {
    if (entry.kind === 'external-program' && (!entry.program_id || !entry.idl_sha256)) {
      throw new Error(`Pinned external program ${entry.name} lacks program ID or IDL hash.`);
    }
    if (entry.kind === 'relay' && !entry.endpoint) {
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
