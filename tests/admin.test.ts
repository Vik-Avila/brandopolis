import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { adminEmails, evidenceCsv } from '../src/application/pilot-admin.js';

const admin = readFileSync('src/application/pilot-admin.ts', 'utf8');
const http = readFileSync('src/transport/http.ts', 'utf8');

describe('pilot admin', () => {
  it('reads the operator allowlist from configuration and never from source', () => {
    expect(adminEmails({})).toEqual([]);
    expect(adminEmails({ BRANDOPOLIS_ADMIN_EMAILS: '' })).toEqual([]);
    expect(adminEmails({ BRANDOPOLIS_ADMIN_EMAILS: '   ' })).toEqual([]);
    // Normalised and trimmed, so casing or spacing in configuration cannot lock an operator out.
    expect(adminEmails({ BRANDOPOLIS_ADMIN_EMAILS: ' One@Example.test , two@example.test ' }))
      .toEqual(['one@example.test', 'two@example.test']);
    // No address is compiled in: an empty allowlist must admit nobody.
    expect(adminEmails({ BRANDOPOLIS_ADMIN_EMAILS: '' })).toHaveLength(0);
    expect(admin).not.toMatch(/@(gmail|brandopolis|example)\.(com|ai|test)/);
  });

  it('requires a live session, a verified email and allowlist membership, all three', () => {
    // The order matters: the session is authorized first, so an anonymous caller never reaches the
    // account lookup, and an unverified account is refused before the allowlist is consulted.
    const authorize = admin.slice(admin.indexOf('async authorizeAdmin'), admin.indexOf('async isAdmin'));
    expect(authorize).toContain('await this.access.authorize(token)');
    expect(authorize).toContain('if (!account?.emailVerifiedAt) throw new AppError');
    expect(authorize).toContain('if (!this.allowlist.includes(account.normalizedEmail)) throw new AppError');
    // Refusals are indistinguishable, so the surface never reveals why it said no.
    expect([...authorize.matchAll(/AppError\('FORBIDDEN', '([^']+)'/g)].map(m => m[1]))
      .toEqual(['Administración no disponible', 'Administración no disponible']);
  });

  it('authorizes every admin endpoint independently, never once at the boundary', () => {
    const pilotAuth = readFileSync('src/transport/pilot-auth.ts', 'utf8');
    for (const method of ['adminSummary', 'adminParticipants', 'adminEvidence', 'adminEvidenceCsv', 'adminFeedback'])
      expect(pilotAuth, method).toContain(`${method}(token:string`);
    // Each read path calls authorizeAdmin before touching any data, in its own body.
    for (const method of ['adminSummary', 'adminParticipants', 'adminEvidence', 'adminEvidenceCsv', 'adminFeedback']) {
      const body = pilotAuth.slice(pilotAuth.indexOf(`async ${method}(token:string`));
      const guard = body.indexOf('await this.admin.authorizeAdmin(token);');
      const work = body.indexOf('return this.admin.');
      expect(guard, `${method} authorizes`).toBeGreaterThan(-1);
      expect(guard, `${method} authorizes before doing work`).toBeLessThan(work);
    }
    // The status change authorizes inside the application method itself.
    expect(admin.slice(admin.indexOf('async setAccessStatus'))).toContain('await this.authorizeAdmin(token)');
    // Admin routes are exempt from the intake gate but never from authorization.
    expect(http).toContain("if(path.startsWith('/api/admin/'))intakeOpen.push(path);");
  });

  it('never selects strategic content into any admin response', () => {
    // The roster and evidence build from identity, account, profile and classified brand records only.
    for (const forbidden of ['decisionVersions', 'documentClaims', 'sourceDocuments', 'userInputs', 'hypotheses', 'evidence)', 'rationale', 'selectedOption'])
      expect(admin, `admin selects ${forbidden}`).not.toContain(`t.${forbidden}`);
    // Nor any credential material.
    for (const secret of ['tokenHash', 'passwordHash', 'verifier', 'nonce', 'stateHash'])
      expect(admin, secret).not.toContain(secret);
  });

  it('reuses the canonical demo-excluding aggregation instead of recomputing evidence', () => {
    // Participant metrics come from report()/metrics(), which strip demo-brand events server-side.
    expect(admin).toContain('await this.access.report()');
    expect(admin).toContain('await this.access.metrics()');
    // Brand classification is resolved once, from the persisted marker, never from a brand name.
    expect(admin).toContain('profiles.filter(p => p.isDemo)');
    // The risk is comparing against a name, not mentioning one in a comment.
    expect(admin).not.toMatch(/name\s*===\s*['"`]/);
    expect(admin).not.toMatch(/includes\(\s*['"`]CoffeePolis/);
    // Real and demo counts are reported separately so an operator can always tell them apart.
    expect(admin).toContain('realBrands:');
    expect(admin).toContain('demoBrands:');
  });

  it('marks underivable metrics unavailable rather than inventing them', () => {
    // Only what this build genuinely cannot measure: AI cost is not captured per request, and there is
    // no payment or offer surface, so these four are reported absent instead of approximated.
    expect(admin).toContain("unavailable: ['aiCostPerDecision', 'aiCostPerActiveBrand', 'willingnessToPay', 'pilotPaidConversion']");
    // The three former gaps are now derived from durable state, so they must no longer be listed.
    const unavailable = admin.slice(admin.indexOf('unavailable: ['), admin.indexOf(']', admin.indexOf('unavailable: [')));
    for (const closed of ['documentEngagement', 'phaseCompletionCounts', 'optionActionCounts'])
      expect(unavailable, closed + ' is derived now and must not be listed as unavailable').not.toContain(closed);
    expect(admin).toContain('phaseCompletionCounts,');
    expect(admin).toContain('optionActionCounts:');
  });

  it('keeps aggregate evidence free of anything that could identify a participant', () => {
    const csv = evidenceCsv({
      generatedAt: 'now', range: { from: null, to: null },
      sample: { participants: 3, intakeComplete: 2, active: 3 },
      engagement: { participantsWithSessions: 3, returningParticipants: 1 },
      product: {
        realBrands: 2, demoBrands: 3, participantsWithRealBrand: 2, participantsWithSecondRealBrand: 0,
        activated: 1, activationRate: 0.333,
        timeToFirstInsight: { n: 1, medianSeconds: 120, averageSeconds: 120 },
        timeToFirstDecision: { n: 1, medianSeconds: 300, averageSeconds: 300 },
        ai: { requested: 5, failed: 1 },
        mapaEstrategico: { viewed: 2, exportedParticipants: 1, exports: 3 },
        evidenceEngagement: { exposed: 2, opened: 1, rate: 0.5, participantsSupplying: 1, documentsUploaded: 4, documentClaimsGenerated: 2 },
        phaseCompletionCounts: { 'Primary Customer': 2, Positioning: 1 },
        strategyReady: { eligibleBrands: 2, ready: 1, rate: 0.5 },
        humanOverride: { resolved: 4, accepted: 1, modified: 2, rejected: 1, rate: 0.75 },
        optionActionCounts: { incorporatedOrModified: 3, rejectedProposals: 1, discarded: null },
        retention: { D7: { observed: 1, returned: 1, rate: 1 }, D14: { observed: 0, returned: 0, rate: null }, D30: { observed: 0, returned: 0, rate: null } }
      },
      segmentation: { primaryProfile: { FUNDADOR: 2, CONSULTOR: 1 }, country: { 'México': 3 }, region: { Veracruz: 3 }, cohort: { A: 2, B: 1 } },
      feedback: { responses: 2, issues: 1, usefulness: 4.5, clarity: 4, confidence: 3.5 },
      unavailable: []
    });
    // Counts by bucket, never rows: real and demo brands are both present and distinct.
    expect(csv).toContain('real_brands,2');
    expect(csv).toContain('demo_brands,3');
    expect(csv).toContain('primaryProfile:FUNDADOR,2');
    // The new Pilot metrics travel as counts and rates, including per-phase progression.
    expect(csv).toContain('mapa_estrategico_exports,3');
    expect(csv).toContain('evidence_engagement_rate,0.5');
    expect(csv).toContain('strategy_ready_rate,0.5');
    expect(csv).toContain('human_override_rate,0.75');
    expect(csv).toContain('phase_completed:Primary Customer,2');
    // An unobserved retention window exports empty, never as a zero rate that would read as churn.
    expect(csv).toContain('retention_D14_rate,');
    expect(csv).not.toContain('retention_D14_rate,0');
    expect(csv).toContain('country:México,3');
    // No identifying column exists at all.
    for (const pii of ['email', 'userId', 'workspaceId', 'brandId', 'name', 'city'])
      expect(csv.toLowerCase(), pii).not.toContain(pii.toLowerCase());
    // City is omitted even in aggregate: a count of one in a small pilot names somebody.
    // City never appears as an evidence bucket, only in the operator roster.
    const evidence = admin.slice(admin.indexOf('async evidence('), admin.indexOf('async feedback('));
    expect(evidence).not.toContain('p.city');
  });

  it('will not let a re-approval resurrect an operator-disabled identity', () => {
    const set = admin.slice(admin.indexOf('async setAccessStatus'));
    // PENDING is refused: this pilot has no manual approval queue to put someone into.
    expect(set).toContain("status === ACCESS_STATUS.pending");
    // The identity's own active flag is reported back, so the caller sees a disable still standing.
    expect(set).toContain('identityActive: identity.active');
    // And the change is audited against the operator who made it.
    expect(set).toContain("event: 'admin_access_status_changed'");
  });
});
