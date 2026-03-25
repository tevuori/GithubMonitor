import { Router, Request, Response } from 'express';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { configurePassport } from '../index';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve path to root .env (two levels up from backend/src/routes)
const ENV_PATH = resolve(__dirname, '../../../.env');

function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    result[key] = val;
  }
  return result;
}

function serializeEnv(values: Record<string, string>): string {
  return Object.entries(values)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n';
}

// GET /api/env/status  — returns whether required keys are present (values redacted)
router.get('/status', (_req: Request, res: Response) => {
  const required = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'SESSION_SECRET'];
  let configured = false;
  let missing: string[] = [];

  if (fs.existsSync(ENV_PATH)) {
    const parsed = parseEnv(fs.readFileSync(ENV_PATH, 'utf-8'));
    missing = required.filter((k) => !parsed[k] || parsed[k].trim() === '');
    configured = missing.length === 0;
  } else {
    missing = required;
  }

  res.json({ configured, missing });
});

// GET /api/env/values  — returns current .env values (masked secrets)
router.get('/values', (_req: Request, res: Response) => {
  if (!fs.existsSync(ENV_PATH)) {
    return res.json({});
  }
  const parsed = parseEnv(fs.readFileSync(ENV_PATH, 'utf-8'));
  // Mask secrets
  const safe: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (k.toLowerCase().includes('secret') || k.toLowerCase().includes('password')) {
      safe[k] = v ? '••••••••' : '';
    } else {
      safe[k] = v;
    }
  }
  return res.json(safe);
});

// POST /api/env/setup  — writes or merges provided keys into .env
router.post('/setup', (req: Request, res: Response) => {
  const updates: Record<string, string> = req.body;

  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // Sanitize: only allow non-empty string values
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (typeof v === 'string' && v.trim() !== '' && /^[A-Z0-9_]+$/.test(k)) {
      // Don't overwrite placeholder masked values
      if (v !== '••••••••') {
        clean[k] = v.trim();
      }
    }
  }

  // Merge with existing .env
  let existing: Record<string, string> = {};
  if (fs.existsSync(ENV_PATH)) {
    existing = parseEnv(fs.readFileSync(ENV_PATH, 'utf-8'));
  }

  const merged = { ...existing, ...clean };
  fs.writeFileSync(ENV_PATH, serializeEnv(merged), 'utf-8');

  // Reload into process.env
  for (const [k, v] of Object.entries(clean)) {
    process.env[k] = v;
  }

  // Re-register passport strategy now that credentials may be available
  const passportReady = configurePassport();

  return res.json({ success: true, written: Object.keys(clean), passportReady });
});

export default router;
