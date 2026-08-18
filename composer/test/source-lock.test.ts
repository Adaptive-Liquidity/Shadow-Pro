import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { sourceLockAllowsExecution, sourceLockBlockers, type SourceLock } from '../src/source-lock.js';

const REQUIRED = ['shadow-paymaster-program', 'jupiter-flashloan', 'jito-block-engine'];

function entryAt(lock: SourceLock, index: number) {
  const entry = lock.entries[index];
  if (!entry) throw new Error(`fixture entry ${index} is missing`);
  return entry;
}

function fullyPinnedLock(): SourceLock {
  return {
    lock_version: '1.0',
    generated_at_utc: '2026-08-18T00:00:00Z',
    entries: [
      {
        name: 'shadow-paymaster-program',
        kind: 'anchor-program',
        program_id: 'PaymasterProgram',
        idl_sha256: 'a'.repeat(64),
        status: 'pinned',
        implementation_gate: 'complete',
      },
      {
        name: 'jupiter-flashloan',
        kind: 'external-program',
        program_id: 'FlashloanProgram',
        idl_sha256: 'b'.repeat(64),
        status: 'pinned',
        implementation_gate: 'complete',
      },
      {
        name: 'jito-block-engine',
        kind: 'relay',
        endpoint: 'https://relay.example',
        status: 'pinned',
        implementation_gate: 'complete',
      },
    ],
  };
}

describe('source lock gate', () => {
  it('denies execution for the repository lock until every required dependency is immutable and pinned', async () => {
    const raw = await readFile(new URL('../../config/sources.lock.json', import.meta.url), 'utf8');
    const lock = JSON.parse(raw) as SourceLock;

    expect(sourceLockAllowsExecution(lock, REQUIRED)).toBe(false);
    expect(sourceLockBlockers(lock, REQUIRED)).toEqual(expect.arrayContaining([
      expect.stringContaining('shadow-paymaster-program'),
      expect.stringContaining('jupiter-flashloan'),
      expect.stringContaining('jito-block-engine'),
    ]));
  });

  it('accepts only a fully pinned, uniquely named, complete dependency set', () => {
    const lock = fullyPinnedLock();

    expect(sourceLockAllowsExecution(lock, REQUIRED)).toBe(true);
    expect(sourceLockBlockers(lock, REQUIRED)).toEqual([]);
  });

  it('rejects an unsupported or malformed dependency kind', () => {
    const lock = fullyPinnedLock();
    entryAt(lock, 0).kind = 'unknown-kind' as never;

    expect(sourceLockAllowsExecution(lock, REQUIRED)).toBe(false);
    expect(sourceLockBlockers(lock, REQUIRED)).toEqual(expect.arrayContaining([
      expect.stringContaining('unsupported source-lock kind'),
    ]));
  });

  it('rejects duplicate source-lock entry names', () => {
    const lock = fullyPinnedLock();
    entryAt(lock, 1).name = entryAt(lock, 0).name;

    expect(sourceLockAllowsExecution(lock, REQUIRED)).toBe(false);
    expect(sourceLockBlockers(lock, REQUIRED)).toEqual(expect.arrayContaining([
      expect.stringContaining('duplicate source-lock entry'),
      expect.stringContaining('jupiter-flashloan: required source-lock entry is missing'),
    ]));
  });

  it('rejects a required entry that is absent even when remaining entries are pinned', () => {
    const lock = fullyPinnedLock();
    lock.entries = lock.entries.filter((entry) => entry.name !== 'jito-block-engine');

    expect(sourceLockAllowsExecution(lock, REQUIRED)).toBe(false);
    expect(sourceLockBlockers(lock, REQUIRED)).toEqual(expect.arrayContaining([
      expect.stringContaining('jito-block-engine: required source-lock entry is missing'),
    ]));
  });

  it('rejects a pinned program entry without an immutable IDL hash', () => {
    const lock = fullyPinnedLock();
    entryAt(lock, 1).idl_sha256 = null;

    expect(sourceLockAllowsExecution(lock, REQUIRED)).toBe(false);
    expect(sourceLockBlockers(lock, REQUIRED)).toEqual(expect.arrayContaining([
      expect.stringContaining('jupiter-flashloan: missing immutable IDL hash'),
    ]));
  });
});
