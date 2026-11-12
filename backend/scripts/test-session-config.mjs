import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import dotenv from 'dotenv';

const backend = fileURLToPath(new URL('../', import.meta.url));
const root = fileURLToPath(new URL('../../', import.meta.url));
const authUrl = new URL('../config/auth.js', import.meta.url).href;
const jwtUrl = new URL('../node_modules/jsonwebtoken/index.js', import.meta.url).href;
const configuredEnv = {
  ...process.env,
  NODE_ENV: 'development', HOST: '127.0.0.1', CLIENT_URL: 'http://localhost:5173',
  TRUST_LOOPBACK_PROXY: 'false', ENABLE_TEST_REGISTRATION: 'false',
  JWT_SECRET: 'Stable-test-only-secret-for-restart-checks',
};
const imports = `
  const {sessionSigningKey} = await import(${JSON.stringify(authUrl)});
  const {default: jwt} = await import(${JSON.stringify(jwtUrl)});
`;

function run(source, { cwd = backend, env = configuredEnv, input } = {}) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', imports + source], {
    cwd, env, input, encoding: 'utf8', timeout: 15000,
  });
}

function verifyRestart(signingCwd, verifyingCwd, env) {
  const signed = run(`
    process.stdout.write(jwt.sign({}, sessionSigningKey, {
      issuer: 'safespeak', audience: 'safespeak-session', expiresIn: '8h', algorithm: 'HS256'
    }));
  `, { cwd: signingCwd, env });
  assert.equal(signed.status, 0, signed.stderr);
  const verified = run(`
    const {readFileSync} = await import('node:fs');
    jwt.verify(readFileSync(0, 'utf8'), sessionSigningKey, {
      issuer: 'safespeak', audience: 'safespeak-session', algorithms: ['HS256'], maxAge: '8h'
    });
    process.stdout.write('verified');
  `, { cwd: verifyingCwd, env, input: signed.stdout });
  assert.equal(verified.status, 0, verified.stderr);
  assert.equal(verified.stdout, 'verified');
}

test('configured process secret survives a fresh process and a different working folder', () => {
  verifyRestart(backend, root, configuredEnv);
});

const envPath = join(backend, '.env');
const fileHasSecret = existsSync(envPath) && Boolean(dotenv.parse(readFileSync(envPath)).JWT_SECRET?.trim());
test('backend .env loads outside the project and preserves JWTs across restarts', { skip: !fileHasSecret }, () => {
  const env = { ...configuredEnv };
  delete env.JWT_SECRET;
  const directory = mkdtempSync(join(tmpdir(), 'safespeak-session-config-'));
  try {
    verifyRestart(directory, root, env);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('missing or blank secrets fail startup instead of silently rotating the signing key', () => {
  for (const secret of ['', '   ']) {
    const result = run('', { env: { ...configuredEnv, JWT_SECRET: secret } });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Set JWT_SECRET in backend\/\.env/);
  }
});

test('explicit process settings take priority over .env', () => {
  const result = run(`
    if (sessionSigningKey !== ${JSON.stringify(configuredEnv.JWT_SECRET)}) throw new Error('Environment override lost');
    process.stdout.write('preserved');
  `);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'preserved');
});
