import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

const bcryptRounds = 12;
const dummyHash = await bcrypt.hash(randomBytes(32).toString('hex'), bcryptRounds);

export async function createAccount({ fullName, email, password, role }) {
  const hash = await bcrypt.hash(password, bcryptRounds);
  await pool.query(
    'INSERT INTO public.users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
    [fullName, email, hash, role]
  );
}

export async function verifyAccount(email, password) {
  const { rows: [account] } = await pool.query(
    `SELECT id, full_name AS "fullName", email, role, is_active, password_hash
     FROM public.users
     WHERE lower(email) = $1`,
    [email]
  );

  const matches = await bcrypt.compare(password, account?.password_hash ?? dummyHash);
  if (!matches || !account?.is_active) return null;

  const { id, fullName, role } = account;
  return { id, fullName, email: account.email, role };
}
