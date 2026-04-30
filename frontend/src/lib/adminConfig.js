// Single source of truth for whether the hardcoded admin mock is enabled.
// The mock must be OFF unless VITE_ENABLE_ADMIN_MOCK is the literal string "true".
// This keeps the /control-center-aio-2026 route closed in production builds
// where the env var is unset or set to "false".
export const ADMIN_MOCK_ENABLED =
  import.meta.env.VITE_ENABLE_ADMIN_MOCK === 'true';
