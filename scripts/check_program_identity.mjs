import { readFile } from 'node:fs/promises';

const anchorTomlPath = new URL('../Anchor.toml', import.meta.url);
const sourceLockPath = new URL('../config/sources.lock.json', import.meta.url);
const programSourcePath = new URL('../programs/shadow_paymaster/src/lib.rs', import.meta.url);

const [anchorToml, sourceLockText, programSource] = await Promise.all([
  readFile(anchorTomlPath, 'utf8'),
  readFile(sourceLockPath, 'utf8'),
  readFile(programSourcePath, 'utf8'),
]);

const errors = [];
const anchorMatch = anchorToml.match(/\[programs\.localnet\][\s\S]*?shadow_paymaster\s*=\s*"([^"]+)"/);
const declareMatch = programSource.match(/declare_id!\("([^"]+)"\);/);
const sourceLock = JSON.parse(sourceLockText);
const lockEntry = sourceLock.entries?.find((entry) => entry.name === 'shadow-paymaster-program');

if (!anchorMatch) errors.push('Anchor.toml is missing [programs.localnet].shadow_paymaster.');
if (!declareMatch) errors.push('Shadow Paymaster declare_id! value is missing.');
if (!lockEntry) errors.push('sources.lock.json is missing shadow-paymaster-program.');

const anchorProgramId = anchorMatch?.[1];
const declaredProgramId = declareMatch?.[1];
const lockedProgramId = lockEntry?.program_id;

if (anchorProgramId && declaredProgramId && anchorProgramId !== declaredProgramId) {
  errors.push('Anchor.toml program ID must equal declare_id!.');
}
if (lockedProgramId && declaredProgramId && lockedProgramId !== declaredProgramId) {
  errors.push('sources.lock.json program ID must equal declare_id!.');
}
if (lockEntry?.status !== 'local-only') {
  errors.push('shadow-paymaster-program must remain local-only before the separate deployment gate.');
}
if (lockEntry?.idl_sha256 !== null) {
  errors.push('Program identity validation does not authorize an IDL pin or deployment. idl_sha256 must remain null.');
}

if (errors.length > 0) {
  console.error('Program identity guard failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(JSON.stringify({
  program_id: declaredProgramId,
  deployment_status: lockEntry.status,
  identity_consistent: true,
  execution_enabled: false,
}));
