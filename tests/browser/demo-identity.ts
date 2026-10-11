import { competitionProfile, localCompetitionUrl } from '../../scripts/competition-environment.js';
import { connect } from '../../src/persistence/database.js';
import { seedIdentity } from '../../scripts/seed.js';

/**
 * A second, separate DEMO identity (own workspace and session) in the local competition database the browser suite
 * runs against, so a test can act as a real guest. Local DEMO databases only; the token never leaves the test.
 */
export async function demoIdentity() {
  const isolated = (process.env.BRANDOPOLIS_BASE_URL ?? '').includes(':3001');
  const url = localCompetitionUrl(competitionProfile(isolated));
  if (!url) throw new Error('Local competition database not found; start it with pnpm competition:start');
  const { db, pool } = connect(url);
  try { return await seedIdentity(db); } finally { await pool.end(); }
}
