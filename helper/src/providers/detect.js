import { spawnWithTimeout } from '../util/spawn.js';
import { PROVIDERS } from './models.js';

const CACHE_TTL_MS = 60_000;
const cliCache = new Map(); // command -> { at, result }

async function detectCli(command) {
  const cached = cliCache.get(command);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.result;

  let result;
  try {
    const { stdout, code } = await spawnWithTimeout(command, ['--version'], { timeoutMs: 5000 });
    result = code === 0
      ? { available: true, version: stdout.trim().split('\n')[0] }
      : { available: false, reason: 'CLI_ERROR' };
  } catch (err) {
    result = { available: false, reason: err.code === 'ENOENT' ? 'CLI_NOT_FOUND' : 'CLI_ERROR' };
  }
  cliCache.set(command, { at: Date.now(), result });
  return result;
}

/** GET /v1/models 응답용 provider 가용성 목록. */
export async function detectProviders(config) {
  const entries = await Promise.all(
    Object.entries(PROVIDERS).map(async ([id, def]) => {
      const base = {
        id,
        label: def.label,
        kind: def.kind,
        models: def.models,
        defaultModel: def.defaultModel,
      };
      if (def.kind === 'cli') {
        return { ...base, ...(await detectCli(def.command)) };
      }
      const hasKey = Boolean(config.keys?.[def.keyName]);
      return { ...base, available: hasKey, ...(hasKey ? {} : { reason: 'NO_API_KEY' }) };
    }),
  );
  return entries;
}
