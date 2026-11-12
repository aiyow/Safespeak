import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Resolve from this file so starting Node in another folder still loads backend/.env.
// Explicit process environment values (including isolated test settings) take priority.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
