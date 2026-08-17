import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { sourceLockAllowsExecution, sourceLockBlockers, type SourceLock } from '../src/source-lock.js';

describe('source lock gate', () => {
  it('denies execution for the repository lock until external IDL and relay endpoints are pinned', async () => {
    const raw = await readFile(new URL('../../config/sources.lock.json', import.meta.url), 'utf8');
    const lock = JSON.parse(raw) as SourceLock;
    expect(sourceLockAllowsExecution(lock)).toBe(false);
    expect(sourceLockBlockers(lock)).toEqual(expect.arrayContaining([
      expect.stringContaining('jupiter-flashloan'),
      expect.stringContaining('jito-block-engine'),
    ]));
  });

  it('accepts only a fully pinned executable dependency set', () => {
    const lock: SourceLock = {
      lock_version: '1.0',
      generated_at_utc: '2026-08-16T00:00:00Z',
      entries: [
        {
          name: 'flash', kind: 'external-program', program_id: 'Program', idl_sha256: 'a'.repeat(64), status: 'pinned', implementation_gate: 'complete',
        },
        {
          name: 'relay', kind: 'relay', endpoint: 'https://relay.example', status: 'pinned', implementation_gate: 'complete',
        },
      ],
    };
    expect(sourceLockAllowsExecution(lock)).toBe(true);
    expect(sourceLockBlockers(lock)).toEqual([]);
  });
});
