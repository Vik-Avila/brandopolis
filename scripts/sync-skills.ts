// `pnpm skills:sync` regenerates .claude/skills/ from .agents/skills/; `pnpm skills:check` only reports drift.
// Any other argument is refused, so a mistyped flag can never trigger a sync.
import { runCli } from './skill-pack.js';

process.exitCode = runCli(process.argv.slice(2));
