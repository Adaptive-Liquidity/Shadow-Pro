import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const templatePath = new URL('../config/devnet-readiness.template.json', import.meta.url);
const sourceLockPath = new URL('../config/sources.lock.json', import.meta.url);
const anchorTomlValidatorPath = new URL('./check_anchor_toml.py', import.meta.url);

const REQUIRED_UNSET_FIELDS = Object.freeze([
  'program_id',
  'deployment_authority_public_key',
  'test_fee_payer_public_key',
  'agent_public_key',
  'governance_public_key',
  'profit_mint',
  'profit_vault',
  'paymaster_destination',
  'treasury_destination',
  'rpc_endpoint',
  'jito_endpoint',
  'remote_signer_reference',
]);

const [templateText, sourceLockText] = await Promise.all([
  readFile(templatePath, 'utf8'),
  readFile(sourceLockPath, 'utf8'),
]);

const template = JSON.parse(templateText);
const sourceLock = JSON.parse(sourceLockText);
const errors = [];

function expectEqual(actual, expected, label) {
  if (actual !== expected) errors.push(`${label} must equal ${JSON.stringify(expected)}.`);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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

const requiredUnsetValues = template.required_unset_values;
if (!isPlainObject(requiredUnsetValues)) {
  errors.push('required_unset_values must be an object.');
} else {
  for (const field of REQUIRED_UNSET_FIELDS) {
    if (!Object.hasOwn(requiredUnsetValues, field)) {
      errors.push(`required_unset_values.${field} is required.`);
      continue;
    }
    expectEqual(requiredUnsetValues[field], null, `required_unset_values.${field}`);
  }
  for (const [field, value] of Object.entries(requiredUnsetValues)) {
    if (!REQUIRED_UNSET_FIELDS.includes(field) && value !== null) {
      errors.push(`required_unset_values.${field} must be null, got: ${JSON.stringify(value)}.`);
    }
  }
}

expectEqual(template.external_dependencies?.jupiter_flashloan?.status, 'blocked', 'jupiter flashloan status');
expectEqual(template.external_dependencies?.jito_block_engine?.status, 'read-only-testnet-observation-only', 'jito status');
expectEqual(template.external_dependencies?.remote_signer?.status, 'blocked', 'remote signer status');

const lockByName = new Map(sourceLock.entries?.map((entry) => [entry.name, entry]));
expectEqual(lockByName.get('jupiter-flashloan')?.status, 'blocked', 'source lock Jupiter status');
expectEqual(lockByName.get('jito-block-engine')?.status, 'blocked', 'source lock Jito status');
expectEqual(lockByName.get('shadow-paymaster-program')?.status, 'local-only', 'source lock paymaster status');

try {
  execFileSync('python3', [anchorTomlValidatorPath.pathname], { stdio: 'inherit' });
} catch {
  errors.push('Anchor.toml structured local-only validation failed.');
}

if (errors.length > 0) {
  console.error('Devnet readiness guard failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Devnet readiness template is deny-by-default; external execution and deployment remain blocked.');
