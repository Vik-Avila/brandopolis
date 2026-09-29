import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { contentSecurityPolicy, ga4MeasurementId, GA4_SCRIPT_ORIGIN, GA4_TRANSPORT_ORIGINS } from '../src/transport/analytics.js';
import { runtimeAssets } from '../src/transport/assets.js';
// The browser module is plain ESM served to the client, so it can be imported directly here.
import * as client from '../src/transport/public/analytics.js';

describe('GA4 pilot analytics', () => {
  beforeEach(() => client.reset());

  it('stays disabled when the Measurement ID is unset, and refuses a malformed one', () => {
    expect(ga4MeasurementId({})).toBeNull();
    expect(ga4MeasurementId({ GA4_MEASUREMENT_ID: '' })).toBeNull();
    expect(ga4MeasurementId({ GA4_MEASUREMENT_ID: '   ' })).toBeNull();
    expect(ga4MeasurementId({ GA4_MEASUREMENT_ID: 'G-ABCDE12345' })).toBe('G-ABCDE12345');
    // A typo must fail loudly at boot instead of silently losing every measurement.
    for (const bad of ['UA-12345-1', 'G-lowercase', 'GTM-ABCDE', 'G-', 'not-an-id'])
      expect(() => ga4MeasurementId({ GA4_MEASUREMENT_ID: bad }), bad).toThrow(/GA4_MEASUREMENT_ID/);
  });

  it('leaves the Content-Security-Policy untouched while GA4 is disabled', () => {
    const off = contentSecurityPolicy(null);
    expect(off).toBe("default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    expect(off).not.toContain('google');
    // Turning it on widens the policy by exactly the Google origins and nothing else.
    const on = contentSecurityPolicy('G-ABCDE12345');
    expect(on).toContain(`script-src 'self' ${GA4_SCRIPT_ORIGIN}`);
    for (const origin of GA4_TRANSPORT_ORIGINS) expect(on).toContain(origin);
    expect(on).toContain("frame-ancestors 'none'");
    expect(on).toContain("base-uri 'none'");
    // No inline or eval escape hatch is ever introduced.
    expect(on).not.toContain('unsafe-inline');
    expect(on).not.toContain('unsafe-eval');
  });

  it('drops every parameter that is not an allowlisted low-risk dimension', () => {
    const dirty = {
      cohort: 'A', auth_method: 'oidc', pilot_stage: 'activated', mode: 'PILOT',
      email: 'someone@example.test',
      displayName: 'A Person',
      userId: '9f1b2c3d-4e5f-6071-8293-a4b5c6d7e8f9',
      workspaceId: 'ws-123', brandId: 'brand-123',
      decision: 'Our positioning is premium continuity for agencies',
      token: 'secret-token-value', issuer: 'https://accounts.google.com', subject: 'sub-123'
    };
    const clean = client.sanitise(dirty);
    expect(clean).toEqual({ cohort: 'A', auth_method: 'oidc', pilot_stage: 'activated', mode: 'PILOT' });
    for (const banned of ['email', 'displayName', 'userId', 'workspaceId', 'brandId', 'decision', 'token', 'issuer', 'subject'])
      expect(clean).not.toHaveProperty(banned);
    // Even an allowlisted key refuses identifier-shaped or oversized values.
    expect(client.sanitise({ cohort: '9f1b2c3d-4e5f-6071-8293-a4b5c6d7e8f9' })).toEqual({});
    expect(client.sanitise({ cohort: 'someone@example.test' })).toEqual({});
    expect(client.sanitise({ pilot_stage: 'https://pilot.brandopolis.ai/x' })).toEqual({});
    expect(client.sanitise({ mode: 'x'.repeat(41) })).toEqual({});
    expect(client.sanitise({ cohort: 'B' })).toEqual({ cohort: 'B' });
  });

  it('sends nothing while disabled and never injects the script twice', () => {
    expect(client.isEnabled()).toBe(false);
    expect(client.send('pilot_landing_view', { cohort: 'A' })).toBe(false);
    expect(client.init(null)).toBe(false);
    expect(client.init('')).toBe(false);
    expect(client.isEnabled()).toBe(false);

    const appended: string[] = [];
    const doc = { head: { append: (el: { src: string }) => appended.push(el.src) }, createElement: () => ({ async: false, src: '' }) };
    const win: Record<string, unknown> = {};
    const globals = globalThis as unknown as { document: unknown; window: unknown };
    const [realDoc, realWin] = [globals.document, globals.window];
    globals.document = doc; globals.window = win;
    try {
      expect(client.init('G-ABCDE12345')).toBe(true);
      expect(client.init('G-ABCDE12345')).toBe(false);   // second call is a no-op
      expect(appended).toHaveLength(1);
      expect(appended[0]).toBe('https://www.googletagmanager.com/gtag/js?id=G-ABCDE12345');
      const sent: unknown[][] = [];
      win.gtag = (...args: unknown[]) => sent.push(args);
      expect(client.send('brand_created', { brandId: 'leak', pilot_stage: 'brand_created' })).toBe(true);
      expect(sent[0]).toEqual(['event', 'brand_created', { pilot_stage: 'brand_created' }]);
      // sendOnce cannot be inflated by a re-render.
      expect(client.sendOnce('pilot_landing_view')).toBe(true);
      expect(client.sendOnce('pilot_landing_view')).toBe(false);
      expect(sent.filter(a => a[1] === 'pilot_landing_view')).toHaveLength(1);
    } finally { globals.document = realDoc; globals.window = realWin; client.reset(); }
  });

  it('keeps the milestone names stable and serves the client module same-origin', () => {
    expect(client.PILOT_EVENTS).toEqual({
      landingView: 'pilot_landing_view',
      loginStarted: 'pilot_login_started',
      loginCompleted: 'pilot_login_completed',
      onboardingStarted: 'onboarding_started',
      brandCreated: 'brand_created',
      firstDecision: 'first_strategic_decision',
      feedbackOpened: 'pilot_feedback_opened',
      intakeStarted: 'pilot_intake_started',
      intakeCompleted: 'pilot_intake_completed',
      demoBrandOpened: 'demo_brand_opened',
      possibilitiesRequested: 'possibilities_requested',
      optionIncorporated: 'ai_option_incorporated',
      optionModified: 'ai_option_modified',
      optionDiscarded: 'ai_option_discarded',
      phaseCompleted: 'phase_completed',
      nextPhaseStarted: 'next_phase_started'
    });
    expect(Object.isFrozen(client.PILOT_EVENTS)).toBe(true);
    // A new runtime file is only reachable once it is on the allowlist.
    expect(runtimeAssets['/analytics.js']).toEqual(['src/transport/public/analytics.js', 'text/javascript; charset=utf-8']);
    // The page must never need an inline <script>: that would force unsafe-inline into the CSP.
    expect(readFileSync('src/transport/public/index.html', 'utf8')).not.toMatch(/<script(?![^>]*\ssrc=)/);
  });
});
