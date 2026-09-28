// GA4: behavioural and navigation analytics for the pilot. It is NOT the canonical evidence layer —
// activation, time to first decision, AI usage and every strategic metric come from Brandopolis
// telemetry. See docs/15-handoff/GA4_PILOT_ANALYTICS.md.
//
// PRIVACY CONTRACT (enforced by send(), not by convention):
// no email, no display name, no user id, no workspace id, no brand id, no document or decision text,
// no tokens, no OIDC identifiers. Only the small allowlist of low-risk dimensions below may be sent.
// gtag is loaded as an external script so the page never needs an inline <script>, which keeps the
// Content-Security-Policy at script-src 'self' https://www.googletagmanager.com.

/** The only parameter names permitted to leave the browser. Anything else is dropped. */
const ALLOWED_PARAMS = new Set(['cohort', 'auth_method', 'pilot_stage', 'mode']);

/** Canonical milestone names. Kept frozen so dashboards do not silently break when code moves. */
export const PILOT_EVENTS = Object.freeze({
  landingView: 'pilot_landing_view',
  loginStarted: 'pilot_login_started',
  loginCompleted: 'pilot_login_completed',
  onboardingStarted: 'onboarding_started',
  brandCreated: 'brand_created',
  firstDecision: 'first_strategic_decision',
  feedbackOpened: 'pilot_feedback_opened'
});

let enabled = false, loaded = false, fired = new Set();

/** Values must be short, non-identifying scalars. Objects, long strings and anything else are refused. */
function safeValue(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 40) return undefined;
  // Refuse anything shaped like an address, a URL or an identifier.
  if (/[@:/\\]/.test(trimmed) || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(trimmed)) return undefined;
  return trimmed;
}

/** Strips every parameter that is not on the allowlist and every value that is not a safe scalar. */
export function sanitise(params = {}) {
  const clean = {};
  for (const [key, value] of Object.entries(params)) {
    if (!ALLOWED_PARAMS.has(key)) continue;
    const safe = safeValue(value);
    if (safe !== undefined) clean[key] = safe;
  }
  return clean;
}

/**
 * Loads gtag once, with advertising features off. Called only when the server reports a Measurement ID,
 * so with GA4 unset nothing is requested, nothing is injected and no global is defined.
 */
export function init(measurementId) {
  if (loaded || !measurementId) return false;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  // gtag must push `arguments`, so this cannot be an arrow function.
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', measurementId, {
    anonymize_ip: true,
    allow_google_signals: false,          // no cross-device identity, no audience sharing
    allow_ad_personalization_signals: false
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
  document.head.append(script);
  enabled = true;
  return true;
}

/** Sends a milestone. Silently does nothing while GA4 is disabled. */
export function send(event, params) {
  if (!enabled || typeof window.gtag !== 'function') return false;
  window.gtag('event', event, sanitise(params));
  return true;
}

/** Milestones that must count at most once per loaded page, so a re-render cannot inflate them. */
export function sendOnce(event, params) {
  if (fired.has(event)) return false;
  fired.add(event);
  return send(event, params);
}

/** Test seam only. */
export function reset() { enabled = false; loaded = false; fired = new Set(); }
export function isEnabled() { return enabled; }
