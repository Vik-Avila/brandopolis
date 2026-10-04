// `pnpm skills:sync` regenerates .claude/skills/ from .agents/skills/; `pnpm skills:check` only reports drift.
import { compareSkillCopies, SKILLS_COPY, SKILLS_SOURCE, syncSkillCopies } from './skill-pack.js';

if (process.argv.includes('--check')) {
  const problems = compareSkillCopies();
  if (problems.length) {
    console.error(`${SKILLS_COPY} diverges from ${SKILLS_SOURCE}:\n- ${problems.join('\n- ')}\nRun pnpm skills:sync.`);
    process.exit(1);
  }
  console.log(`${SKILLS_COPY} is byte-identical to ${SKILLS_SOURCE}.`);
} else {
  const count = syncSkillCopies();
  console.log(`Copied ${count} file(s) from ${SKILLS_SOURCE} to ${SKILLS_COPY}.`);
}
