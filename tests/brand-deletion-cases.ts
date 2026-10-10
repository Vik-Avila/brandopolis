import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { and, eq } from 'drizzle-orm';
import type { connect } from '../src/persistence/database.js';
import { Engine } from '../src/application/engine.js';
import { createApp, purgePendingBrandFiles, purgeBrandFiles, type BrandFilePurge } from '../src/transport/http.js';
import { seedIdentity } from '../scripts/seed.js';
import * as t from '../src/persistence/schema.js';

/** Every table that holds rows owned by a Brand (ADR-0029). The deletion must leave zero rows in each. */
const OWNED = {
  brands: t.brands, brand_assignments: t.assignments, brand_profiles: t.brandProfiles, questions: t.questions,
  recommendations: t.recommendations, decisions: t.decisions, decision_versions: t.versions, dependencies: t.dependencies,
  review_items: t.reviews, impacts: t.impacts, strategic_audit: t.audits, idempotency: t.idempotency, telemetry: t.telemetry,
  review_receipts: t.reviewReceipts, user_inputs: t.userInputs, evidence: t.evidence, hypotheses: t.hypotheses,
  open_questions: t.openQuestions, analyses: t.analyses, experiments: t.experiments, signals: t.signals, learnings: t.learnings,
  learning_signals: t.learningSignals, source_documents: t.sourceDocuments, document_extractions: t.documentExtractions,
  document_claims: t.documentClaims
} as const;

/** ADR-0029 · Eliminar marca: admin-only, typed confirmation, complete purge, private reflections unlinked, idempotent. */
export function brandDeletionCases(connection: () => ReturnType<typeof connect>) {
  const counts = async (brandId: string) => {
    const db = connection().db, out: Record<string, number> = {};
    for (const [name, table] of Object.entries(OWNED)) {
      const column = 'brandId' in table ? (table as typeof t.questions).brandId : (table as typeof t.brands).id;
      out[name] = (await db.select().from(table as typeof t.questions).where(eq(column, brandId))).length;
    }
    return out;
  };

  /** Synthetic Brand with strategy, validation loop, evidence, documents, profile, a NEEDS_REVIEW cascade and an analysis. */
  const populate = async (engine: Engine, token: string, userId: string, name: string, root?: string) => {
    const brand = await engine.createBrand(token, name, 'Contexto inicial sintético');
    const ctx = () => engine.context(token, brand.id);
    const commit = async (module: string, text: string) => {
      const c = await ctx(), q = c.questions.find(x => x.module === module)!, d = c.decisions.find(x => x.questionId === q.id);
      await engine.prepareQuestion(token, brand.id, q.id, d?.activeVersionId ?? null);
      return engine.commitDecision(token, { brandId: brand.id, questionId: q.id, selectedOption: text, rationale: 'Criterio humano sintético', expectedActiveVersion: d?.activeVersionId ?? null, sourceRecommendationId: null, idempotencyKey: randomUUID(), actorUserId: userId });
    };
    const customer = await commit('Primary Customer', 'Agencias');
    await commit('Positioning', 'Continuidad estratégica');
    await commit('Primary Customer', 'Agencias medianas'); // supersedes v1 and opens a HARD review downstream
    await engine.setBrandGeography(token, brand.id, 'LOCAL', 'Xalapa');
    await engine.captureContext(token, brand.id, 'evidence', { claim: 'Entrevistas sintéticas', source: 'Entrevistas', sourceDate: '2026-09-24', provenance: 'registro sintético', sourceQuality: 'MEDIUM', relevance: 'DIRECT', freshness: 'CURRENT', limitations: ['muestra pequeña'], external: false }, randomUUID());
    await engine.captureContext(token, brand.id, 'open-question', { text: '¿Qué falta validar?', status: 'OPEN', relatedHypothesisId: null });
    const hypothesis = await engine.captureContext(token, brand.id, 'hypothesis', { statement: 'Las agencias vuelven cada semana' });
    const priority = await commit('Priority Experiment', 'Validar el regreso semanal');
    const experiment = await engine.createLearningObject(token, brand.id, 'experiment', { hypothesisId: hypothesis.id, intendedSignal: 'Regreso semanal', method: 'Seguimiento consentido', disconfirmingCriteria: 'Menos de dos regresan' }, priority.decisionId, { objective: 'Comprobar regreso', successCriteria: 'Tres de cinco' });
    await engine.transitionLearningObject(token, brand.id, 'experiment', String(experiment.id), 'PLANNED', 'RUNNING');
    const signal = await engine.createLearningObject(token, brand.id, 'signal', { experimentId: experiment.id, observation: 'Una agencia regresó', source: 'Registro consentido', observedAt: new Date().toISOString(), direction: 'CONTRARY' });
    const learning = await engine.createLearningObject(token, brand.id, 'learning', { signalIds: [signal.id], hypothesisId: hypothesis.id, interpretation: 'No se sostiene todavía', limitations: ['Muestra pequeña'], supports: 'Una regresó', doesNotSupport: 'Cuatro no', alternativeExplanations: ['Vacaciones'] });
    await engine.transitionLearningObject(token, brand.id, 'learning', String(learning.id), 'CANDIDATE', 'REVIEWED');
    const message = (await ctx()).questions.find(q => q.module === 'Core Message')!;
    await engine.analyze(token, brand.id, message.id);
    const documentId = randomUUID(), storageKey = `${(await engine.me(token)).workspaceId}/${brand.id}/${documentId}/original`;
    if (root) { mkdirSync(join(root, storageKey, '..'), { recursive: true }); writeFileSync(join(root, storageKey), 'documento sintético'); }
    await engine.registerSourceDocument(token, brand.id, { id: documentId, originalName: 'sintetico.txt', mediaType: 'text/plain', bytes: 19, sha256: 'a'.repeat(64), storageKey });
    await engine.persistDocumentExtraction(token, brand.id, documentId, { extractorVersion: 'local-v1', content: 'documento sintético', metadata: { format: 'text', pages: null, slides: null, characters: 19, segments: 1, truncated: false } } as never);
    return { brand, customer, documentId, storageKey };
  };

  const app = async (engine: Engine, brandFilePurge?: BrandFilePurge) => {
    const server = createApp(engine, undefined, undefined, undefined, undefined, undefined, brandFilePurge ? { brandFilePurge } : undefined);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const del = (token: string | null, body: Record<string, unknown>, origin: string | null = base) => fetch(base + '/api/brands/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}), ...(token ? { Cookie: `brandopolis_session=${token}` } : {}) },
      body: JSON.stringify(body)
    });
    return { server, base, del, close: () => new Promise<void>(resolve => server.close(() => resolve())) };
  };

  const withRoot = async <T>(run: (root: string) => Promise<T>) => {
    const previous = process.env.BRANDOPOLIS_DOCUMENT_ROOT, root = mkdtempSync(join(tmpdir(), 'brandopolis-deletion-'));
    process.env.BRANDOPOLIS_DOCUMENT_ROOT = root;
    try { return await run(root); }
    finally { if (previous === undefined) delete process.env.BRANDOPOLIS_DOCUMENT_ROOT; else process.env.BRANDOPOLIS_DOCUMENT_ROOT = previous; rmSync(root, { recursive: true, force: true }); }
  };

  describe('ADR-0029 · Eliminar marca', () => {
    it('BRD-001..004: an admin deletes one Brand completely; the other Brand, the session and private reflections survive', async () => withRoot(async root => {
      const db = connection().db, engine = new Engine(db), who = await seedIdentity(db), colleague = await seedIdentity(db, 'ADMIN', who.workspaceId);
      const doomed = await populate(engine, who.token, who.userId, 'Marca a eliminar', root);
      const kept = await populate(engine, who.token, who.userId, 'Marca que se queda', root);
      // Private reflections of the deleting user and of a colleague, linked to the doomed Brand and decision.
      const mine = await engine.createReflection(who.token, { changedThinking: 'Mi reflexión', brandId: doomed.brand.id, decisionId: doomed.customer.decisionId, idempotencyKey: randomUUID() });
      const theirs = await engine.createReflection(colleague.token, { changedThinking: 'Reflexión de colega', brandId: doomed.brand.id, idempotencyKey: randomUUID() });
      const keptReflection = await engine.createReflection(who.token, { changedThinking: 'Sobre la otra marca', brandId: kept.brand.id, idempotencyKey: randomUUID() });
      // Pilot analytics carry no brand content: they stay, unlinked.
      await db.insert(t.pilotWorkspaces).values({ workspaceId: who.workspaceId, cohort: 'SYNTHETIC', createdAt: new Date() }).onConflictDoNothing();
      const eventId = randomUUID(), feedbackId = randomUUID();
      await db.insert(t.pilotEvents).values({ id: eventId, userId: who.userId, workspaceId: who.workspaceId, brandId: doomed.brand.id, name: 'synthetic', cohort: 'SYNTHETIC', intervention: 'NONE', occurredAt: new Date() });
      await db.insert(t.feedback).values({ id: feedbackId, userId: who.userId, workspaceId: who.workspaceId, brandId: doomed.brand.id, sessionId: 's', usefulness: 4, clarity: 4, confidence: 4, comment: 'útil', kind: 'GENERAL', createdAt: new Date() });

      const before = await counts(doomed.brand.id), keptBefore = await counts(kept.brand.id);
      for (const table of ['decisions', 'decision_versions', 'dependencies', 'review_items', 'impacts', 'strategic_audit', 'idempotency', 'telemetry', 'evidence', 'hypotheses', 'open_questions', 'experiments', 'signals', 'learnings', 'learning_signals', 'recommendations', 'analyses', 'source_documents', 'document_extractions', 'brand_profiles', 'brand_assignments', 'user_inputs', 'questions'])
        expect(before[table], `fixture populates ${table}`).toBeGreaterThan(0);

      const { del, close } = await app(engine);
      try {
        const key = randomUUID();
        const response = await del(who.token, { brandId: doomed.brand.id, confirmName: 'Marca a eliminar', idempotencyKey: key });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ status: 'DELETED', brandId: doomed.brand.id });
        expect(Object.values(await counts(doomed.brand.id)).every(n => n === 0), JSON.stringify(await counts(doomed.brand.id))).toBe(true);
        expect(await counts(kept.brand.id), 'the other Brand in the same workspace is intact').toEqual(keptBefore);
        expect(existsSync(join(root, who.workspaceId, doomed.brand.id)), 'deleted Brand files purged').toBe(false);
        expect(existsSync(join(root, kept.storageKey)), 'other Brand files intact').toBe(true);
        // Session stays valid; the Brand is gone from the list; the other Brand still reads.
        expect((await engine.listBrands(who.token)).map(b => b.id)).toEqual([kept.brand.id]);
        expect((await engine.context(who.token, kept.brand.id)).versions.length).toBeGreaterThan(0);
        // Reflections: preserved for their authors, unlinked from the deleted Brand and decision.
        const reflections = await db.select().from(t.personalReflections).where(eq(t.personalReflections.workspaceId, who.workspaceId));
        for (const id of [mine.id, theirs.id]) {
          const row = reflections.find(r => r.id === id)!;
          expect(row, 'reflection preserved').toBeDefined();
          expect([row.brandId, row.decisionId, row.payload.brandId, row.payload.decisionId]).toEqual([null, null, null, null]);
        }
        expect(reflections.find(r => r.id === theirs.id)!.userId, 'ownership unchanged').toBe(colleague.userId);
        expect(reflections.find(r => r.id === keptReflection.id)!.brandId).toBe(kept.brand.id);
        expect((await engine.reflections(colleague.token)).map(r => r.changedThinking)).toEqual(['Reflexión de colega']);
        const [event] = await db.select().from(t.pilotEvents).where(eq(t.pilotEvents.id, eventId));
        const [fb] = await db.select().from(t.feedback).where(eq(t.feedback.id, feedbackId));
        expect([event.brandId, fb.brandId, fb.comment]).toEqual([null, null, 'útil']);
        // Minimal record: no name, no content.
        const [record] = await db.select().from(t.brandDeletions).where(eq(t.brandDeletions.brandId, doomed.brand.id));
        expect(record).toMatchObject({ workspaceId: who.workspaceId, actorUserId: who.userId, idempotencyKey: key, status: 'DELETED', storagePrefix: `${who.workspaceId}/${doomed.brand.id}` });
        expect(JSON.stringify(record)).not.toContain('Marca a eliminar');
        // Replay with the same key returns the same outcome and does nothing else.
        const replay = await del(who.token, { brandId: doomed.brand.id, confirmName: 'Marca a eliminar', idempotencyKey: key });
        expect([replay.status, await replay.json()]).toEqual([200, { status: 'DELETED', brandId: doomed.brand.id }]);
        expect((await db.select().from(t.brandDeletions).where(eq(t.brandDeletions.brandId, doomed.brand.id)))).toHaveLength(1);
        // A different key after deletion: indistinguishable from an unknown Brand.
        expect((await del(who.token, { brandId: doomed.brand.id, confirmName: 'Marca a eliminar', idempotencyKey: randomUUID() })).status).toBe(404);
        // The colleague cannot read the actor's idempotent outcome with the same key: for them it is just a missing Brand.
        expect((await del(colleague.token, { brandId: doomed.brand.id, confirmName: 'Marca a eliminar', idempotencyKey: key })).status).toBe(404);
      } finally { await close(); }
    }));

    it('BRD-005: wrong confirmation, non-admin, other tenant, no session and missing Origin delete nothing', async () => {
      const db = connection().db, engine = new Engine(db), who = await seedIdentity(db);
      const brand = await engine.createBrand(who.token, 'Café Azul');
      const member = await seedIdentity(db, 'MEMBER', who.workspaceId), stranger = await seedIdentity(db);
      await db.insert(t.assignments).values({ workspaceId: who.workspaceId, brandId: brand.id, userId: member.userId });
      const before = await counts(brand.id);
      const { del, close } = await app(engine);
      try {
        const body = (confirmName: string) => ({ brandId: brand.id, confirmName, idempotencyKey: randomUUID() });
        for (const wrong of ['café azul', 'Café Azul ', ' Café Azul', 'Cafe Azul', 'Otra'])
          expect((await del(who.token, body(wrong))).status, `confirmName «${wrong}»`).toBe(400);
        expect((await del(who.token, { brandId: brand.id, idempotencyKey: randomUUID() })).status, 'confirmName required').toBe(400);
        expect((await del(who.token, { brandId: brand.id, confirmName: 'Café Azul' })).status, 'idempotency key required').toBe(400);
        expect((await del(who.token, { brandId: brand.id, confirmName: 'Café Azul', idempotencyKey: 'x'.repeat(201) })).status).toBe(400);
        expect((await del(member.token, body('Café Azul'))).status, 'assigned MEMBER is not an admin').toBe(403);
        expect((await del(stranger.token, body('Café Azul'))).status, 'other tenant').toBe(404);
        expect((await del(null, body('Café Azul'))).status, 'no session').toBe(401);
        expect((await del(who.token, body('Café Azul'), null)).status, 'missing Origin').toBe(403);
        expect((await del(who.token, body('Café Azul'), 'http://evil.example')).status, 'foreign Origin').toBe(403);
        expect(await counts(brand.id), 'nothing deleted').toEqual(before);
        expect(await db.select().from(t.brandDeletions).where(eq(t.brandDeletions.brandId, brand.id))).toHaveLength(0);
      } finally { await close(); }
    });

    it('BRD-006: concurrent deletes — same key share one outcome, different keys give the loser 404; a racing write never survives', async () => {
      const db = connection().db, engine = new Engine(db), who = await seedIdentity(db);
      const a = await engine.createBrand(who.token, 'Concurrente A'), b = await engine.createBrand(who.token, 'Concurrente B');
      const key = randomUUID(), input = { brandId: a.id, confirmName: 'Concurrente A', idempotencyKey: key };
      const [x, y] = await Promise.all([engine.deleteBrand(who.token, input), engine.deleteBrand(who.token, input)]);
      expect([x.status, x.brandId, x.deletionId]).toEqual([y.status, y.brandId, y.deletionId]);
      expect(await db.select().from(t.brandDeletions).where(eq(t.brandDeletions.brandId, a.id))).toHaveLength(1);
      const results = await Promise.allSettled([
        engine.deleteBrand(who.token, { brandId: b.id, confirmName: 'Concurrente B', idempotencyKey: randomUUID() }),
        engine.deleteBrand(who.token, { brandId: b.id, confirmName: 'Concurrente B', idempotencyKey: randomUUID() }),
        engine.captureContext(who.token, b.id, 'user-input', { statement: 'Escritura concurrente' })
      ]);
      expect(results.slice(0, 2).filter(r => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.slice(0, 2).find(r => r.status === 'rejected')).toMatchObject({ reason: { code: 'NOT_FOUND' } });
      if (results[2].status === 'rejected') expect(results[2].reason).toMatchObject({ code: 'NOT_FOUND' });
      expect(Object.values(await counts(b.id)).every(n => n === 0)).toBe(true);
      // Replaying a key for a different Brand is a conflict, never a silent second deletion.
      const c = await engine.createBrand(who.token, 'Concurrente C');
      await expect(engine.deleteBrand(who.token, { brandId: c.id, confirmName: 'Concurrente C', idempotencyKey: key })).rejects.toMatchObject({ code: 'CONFLICT' });
      expect((await engine.listBrands(who.token)).map(r => r.id)).toEqual([c.id]);
    });

    it('BRD-007: history guards still refuse direct deletes outside an authorized Brand deletion', async () => {
      const db = connection().db, engine = new Engine(db), who = await seedIdentity(db);
      const { brand } = await populate(engine, who.token, who.userId, 'Historia protegida');
      await expect(db.delete(t.versions).where(eq(t.versions.brandId, brand.id))).rejects.toBeDefined();
      await expect(db.delete(t.audits).where(eq(t.audits.brandId, brand.id))).rejects.toBeDefined();
      expect((await db.select().from(t.versions).where(eq(t.versions.brandId, brand.id))).length).toBeGreaterThan(0);
    });

    it('BRD-008: a failed file purge reports FILES_PENDING, never full deletion, and the retry completes it', async () => withRoot(async root => {
      const db = connection().db, engine = new Engine(db), who = await seedIdentity(db);
      const { brand, storageKey } = await populate(engine, who.token, who.userId, 'Archivos pendientes', root);
      const failing: BrandFilePurge = async () => { throw new Error('simulated purge failure'); };
      const broken = await app(engine, failing);
      try {
        const response = await broken.del(who.token, { brandId: brand.id, confirmName: 'Archivos pendientes', idempotencyKey: randomUUID() });
        expect([response.status, await response.json()]).toEqual([200, { status: 'FILES_PENDING', brandId: brand.id }]);
      } finally { await broken.close(); }
      expect(Object.values(await counts(brand.id)).every(n => n === 0), 'database rows are gone even when files are pending').toBe(true);
      expect(existsSync(join(root, storageKey))).toBe(true);
      const [pending] = await db.select().from(t.brandDeletions).where(and(eq(t.brandDeletions.brandId, brand.id), eq(t.brandDeletions.status, 'FILES_PENDING')));
      expect(pending.completedAt).toBeNull();
      expect(await purgePendingBrandFiles(engine)).toMatchObject({ pending: 0 });
      expect(existsSync(join(root, who.workspaceId, brand.id))).toBe(false);
      const [done] = await db.select().from(t.brandDeletions).where(eq(t.brandDeletions.id, pending.id));
      expect(done.status).toBe('DELETED');
      expect(done.completedAt).toBeInstanceOf(Date);
    }));

    it('BRD-009: the purge is confined to <root>/<workspaceId>/<brandId>', async () => withRoot(async root => {
      for (const prefix of ['', '.', '..', '../x', 'ws', 'ws/brand/doc', '../../etc', 'ws/..', '/abs/path'])
        await expect(purgeBrandFiles(prefix), prefix).rejects.toMatchObject({ code: 'INVALID' });
      writeFileSync(join(root, 'sentinel'), 'x');
      await purgeBrandFiles('ws/missing-brand'); // missing directory = nothing to purge
      expect(existsSync(join(root, 'sentinel'))).toBe(true);
    }));
  });
}
