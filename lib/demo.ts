// Demo-environment flags. Read on the server only (no NEXT_PUBLIC_ prefix).

/** Public self-registration stays closed unless ALLOW_SIGNUP is exactly "true". */
export const allowSignup = process.env.ALLOW_SIGNUP === 'true'

/** Demo mode (banner + noindex) is on unless DEMO_MODE is exactly "false". */
export const isDemoMode = process.env.DEMO_MODE !== 'false'
