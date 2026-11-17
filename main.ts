// Emberhold — the entrypoint for make.fun's best-game-01 (Node 22, standard
// library only). It hands the game in: it copies this repository's game/ and
// screenshots/ into /output (or MAKEFUN_OUTPUT_DIR outside the grader) and
// writes /output/dossier.json, the summary the judge reads, with the
// vendored make.fun library. The game itself is plain static files under
// game/ — no build step, no network request at play time.
//
// Run it locally to check the handover:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve game/ to play it in desktop Chrome:
//   node serve.ts, then open http://localhost:8080

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's caps, from the kit's reference: the dossier text is capped at
// 160 KiB, at most 4 screenshots of 256 KiB each, and game/ stays under 993
// files, 48 MiB in all, with no path over 1,000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
