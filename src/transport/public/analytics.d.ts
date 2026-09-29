// Types for the browser analytics module so server-side tests can exercise the privacy contract
// directly. The runtime file stays plain ESM: it is served to the browser as-is.
export declare const PILOT_EVENTS: Readonly<{
  landingView: 'pilot_landing_view';
  loginStarted: 'pilot_login_started';
  loginCompleted: 'pilot_login_completed';
  onboardingStarted: 'onboarding_started';
  brandCreated: 'brand_created';
  firstDecision: 'first_strategic_decision';
  feedbackOpened: 'pilot_feedback_opened';
  intakeStarted: 'pilot_intake_started';
  intakeCompleted: 'pilot_intake_completed';
  demoBrandOpened: 'demo_brand_opened';
}>;
/** Drops every parameter outside the low-risk allowlist and every unsafe value. */
export declare function sanitise(params?: Record<string, unknown>): Record<string, string | number | boolean>;
/** Loads gtag once with advertising features off. Returns false when GA4 is disabled or already loaded. */
export declare function init(measurementId: string | null): boolean;
export declare function send(event: string, params?: Record<string, unknown>): boolean;
export declare function sendOnce(event: string, params?: Record<string, unknown>): boolean;
export declare function reset(): void;
export declare function isEnabled(): boolean;
