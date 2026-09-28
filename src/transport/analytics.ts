// GA4 is behavioural/navigation analytics only. It is NEVER the canonical evidence layer: operational and
// strategic evidence lives in Brandopolis telemetry (pilot_events, capability_events, the pilot report).
// See docs/15-handoff/GA4_PILOT_ANALYTICS.md.
//
// The application ships a strict Content-Security-Policy. GA4 cannot run under `script-src 'self'`, so the
// policy is widened ONLY while a Measurement ID is configured, and only by the exact origins Google needs.

/** Google's documented format: "G-" followed by an alphanumeric stream id. */
const MEASUREMENT_ID=/^G-[A-Z0-9]{4,24}$/;

/** Google Analytics origins. Kept here so the CSP and the client loader can never drift apart. */
export const GA4_SCRIPT_ORIGIN='https://www.googletagmanager.com';
export const GA4_TRANSPORT_ORIGINS=['https://www.google-analytics.com','https://analytics.google.com','https://region1.google-analytics.com'] as const;

/**
 * Resolves the configured Measurement ID.
 * Unset or empty -> null, and GA4 stays completely disabled (no script, no widened CSP, no client work).
 * Malformed -> throws, so an operator typo fails at boot instead of silently losing every measurement.
 */
export function ga4MeasurementId(env:NodeJS.ProcessEnv=process.env):string|null {
  const raw=env.GA4_MEASUREMENT_ID?.trim();
  if(!raw)return null;
  if(!MEASUREMENT_ID.test(raw))throw new Error('GA4_MEASUREMENT_ID must look like G-XXXXXXXXXX, or be unset to disable analytics.');
  return raw;
}

/**
 * The Content-Security-Policy header value. With GA4 disabled this is byte-identical to the policy the
 * application has always sent, so turning analytics off restores the original security posture exactly.
 */
export function contentSecurityPolicy(measurementId:string|null):string {
  const script=measurementId?`'self' ${GA4_SCRIPT_ORIGIN}`:"'self'";
  const connect=measurementId?`'self' ${GA4_TRANSPORT_ORIGINS.join(' ')}`:"'self'";
  // GA4 still falls back to image beacons when sendBeacon/fetch are unavailable.
  const img=measurementId?`; img-src 'self' data: ${GA4_TRANSPORT_ORIGINS.join(' ')}`:'';
  return `default-src 'self'; script-src ${script}; style-src 'self'; connect-src ${connect}${img}; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`;
}
