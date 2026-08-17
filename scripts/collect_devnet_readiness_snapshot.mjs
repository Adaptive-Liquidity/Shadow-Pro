import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const args = process.argv.slice(2);

function argument(name, { required = false } = {}) {
  const index = args.indexOf(name);
  if (index === -1) {
    if (required) throw new Error(`Missing required argument ${name}.`);
    return undefined;
  }
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}.`);
  return value;
}

function hasFlag(name) {
  return args.includes(name);
}

function assertPublicKey(value, label) {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
    throw new Error(`${label} must be a base58 Solana public key.`);
  }
}

const rpc = argument('--rpc') ?? DEVNET_RPC;
const agent = argument('--agent', { required: true });
const program = argument('--program');
const outputPath = argument('--out');
const requireProgram = hasFlag('--require-program');

if (rpc !== DEVNET_RPC) {
  throw new Error('Only the official devnet RPC is accepted by this readiness collector.');
}
assertPublicKey(agent, 'agent');
if (program) assertPublicKey(program, 'program');
if (requireProgram && !program) throw new Error('--require-program requires --program.');

async function rpcRequest(method, params) {
  const response = await fetch(rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: `shadow-readonly-${method}`, method, params }),
  });
  if (!response.ok) throw new Error(`${method} returned HTTP ${response.status}.`);
  const body = await response.json();
  if (body.error) throw new Error(`${method} RPC error: ${JSON.stringify(body.error)}.`);
  return body.result;
}

const [version, slot, balanceResult, programResult] = await Promise.all([
  rpcRequest('getVersion', []),
  rpcRequest('getSlot', [{ commitment: 'finalized' }]),
  rpcRequest('getBalance', [agent, { commitment: 'finalized' }]),
  program
    ? rpcRequest('getAccountInfo', [program, { commitment: 'finalized', encoding: 'base64' }])
    : Promise.resolve(undefined),
]);

const agentLamports = BigInt(balanceResult.value);
if (agentLamports !== 0n) {
  throw new Error(`Zero-capital invariant failed: agent has ${agentLamports} lamports on devnet.`);
}

const programValue = programResult?.value ?? null;
if (requireProgram && (!programValue || programValue.executable !== true)) {
  throw new Error('Required devnet program is absent or not executable.');
}

const snapshot = {
  schema_version: '1.0',
  environment: 'devnet',
  mode: 'read-only-readiness-snapshot',
  submission_performed: false,
  signer_connection_performed: false,
  funding_performed: false,
  collected_at_utc: new Date().toISOString(),
  rpc_endpoint: rpc,
  cluster_version: version,
  finalized_slot: slot,
  agent: {
    public_key: agent,
    lamports: agentLamports.toString(),
    invariant: 'zero-capital-pass',
  },
  program: program
    ? {
        public_key: program,
        observed: programValue !== null,
        executable: programValue?.executable ?? false,
        owner: programValue?.owner ?? null,
        lamports: programValue?.lamports?.toString?.() ?? null,
        space: programValue?.space ?? null,
      }
    : null,
};

const canonical = JSON.stringify(snapshot);
const receipt = {
  ...snapshot,
  receipt_sha256: createHash('sha256').update(canonical).digest('hex'),
};
const output = `${JSON.stringify(receipt, null, 2)}\n`;

if (outputPath) {
  await writeFile(outputPath, output, { encoding: 'utf8', flag: 'wx' });
} else {
  process.stdout.write(output);
}
