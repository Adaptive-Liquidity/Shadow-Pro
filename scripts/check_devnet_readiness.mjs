import { readFile } from 'node:fs/promises';

const templatePath = new URL('../config/devnet-readiness.template.json', import.meta.url);
const sourceLockPath = new URL('../config/sources.lock.json', import.meta.url);
const anchorTomlPath = new URL('../Anchor.toml', import.meta.url);

const [templateText, sourceLockText, anchorToml] = await Promise.all([
  readFile(templatePath, 'utf8'),
  readFile(sourceLockPath, 'utf8'),
  readFile(anchorTomlPath, 'utf8'),
]);

const template = JSON.parse(templateText);
const sourceLock = JSON.parse(sourceLockText);
const errors = [];

function expectEqual(actual, expected, label) {
  if (actual !== expected) errors.push(`${label} must equal ${JSON.stringify(expected)}.`);
}

expectEqual(template.schema_version, '1.0', 'schema_version');
expectEqual(template.environment, 'devnet', 'environment');
expectEqual(template.mode, 'readiness-only', 'mode');

for (const field of [
  'execution_enabled',
  'network_submission_enabled',
  'signer_connection_enabled',
  'jito_submission_enabled',
  'jupiter_flashloan_enabled',
  'deployment_enabled',
  'funding_enabled',
]) {
  expectEqual(template[field], false, field);
}

for (const [field, value] of Object.entries(template.required_unset_values ?? {})) {
  expectEqual(value, null, `required_unset_values.${field}`);
}

expectEqual(template.external_dependencies?.jupiter_flashloan?.status, 'blocked', 'jupiter flashloan status');
expectEqual(template.external_dependencies?.jito_block_engine?.status, 'read-only-testnet-observation-only', 'jito status');
expectEqual(template.external_dependencies?.remote_signer?.status, 'blocked', 'remote signer status');

const lockByName = new Map(sourceLock.entries?.map((entry) => [entry.name, entry]));
expectEqual(lockByName.get('jupiter-flashloan')?.status, 'blocked', 'source lock Jupiter status');
expectEqual(lockByName.get('jito-block-engine')?.status, 'blocked', 'source lock Jito status');
expectEqual(lockByName.get('shadow-paymaster-program')?.status, 'local-only', 'source lock paymaster status');

if (!anchorToml.includes('cluster = "Localnet"')) {
  errors.push('Anchor.toml must remain Localnet-only during devnet readiness preparation.');
}
if (!anchorToml.includes('LOCAL_ONLY_DO_NOT_FUND')) {
  errors.push('Anchor.toml must retain a local-only non-funded wallet marker.');
}

if (errors.length > 0) {
  console.error('Devnet readiness guard failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Devnet readiness template is deny-by-default; external execution and deployment remain blocked.');
