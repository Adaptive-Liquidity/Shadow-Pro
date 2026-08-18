import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const [sourcePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) {
  throw new Error('Usage: node scripts/extract_jupiter_flashloan_matrix.mjs <immutable-idl.json> <output.json>');
}

const raw = await readFile(sourcePath);
const idl = JSON.parse(raw.toString('utf8'));
const expectedProgramId = 'jupgfSgfuAXv4B6R2Uxu85Z1qdzgju79s6MfZekN6XS';
if (idl.address !== expectedProgramId) {
  throw new Error(`Unexpected Flashloan program ID: ${idl.address}`);
}

const names = new Set(['flashloan_borrow', 'flashloan_payback']);
const instructions = idl.instructions
  .filter((instruction) => names.has(instruction.name))
  .map((instruction) => ({
    name: instruction.name,
    discriminator: instruction.discriminator,
    args: instruction.args,
    accounts: instruction.accounts.map((account, index) => ({
      index,
      name: account.name,
      signer: account.signer === true,
      writable: account.writable === true,
      optional: account.optional === true,
      address: account.address ?? null,
      relations: account.relations ?? [],
      pda: account.pda ?? null,
    })),
  }));

if (instructions.length !== names.size) {
  throw new Error('Expected exactly one borrow and one payback instruction in the immutable IDL.');
}

const matrix = {
  schema_version: '1.0',
  artifact_sha256: createHash('sha256').update(raw).digest('hex'),
  program_id: idl.address,
  idl_name: idl.metadata?.name ?? null,
  idl_version: idl.metadata?.version ?? null,
  instructions,
};

await writeFile(outputPath, `${JSON.stringify(matrix, null, 2)}\n`, 'utf8');
