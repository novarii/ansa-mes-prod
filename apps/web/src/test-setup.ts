/**
 * Test setup for Vitest
 *
 * Configures testing environment including DOM matchers.
 * Sets IS_REACT_ACT_ENVIRONMENT for React 19 compatibility.
 */

import '@testing-library/jest-dom/vitest';

// React 19 requires this flag to be set for act() to work properly
// See: https://react.dev/reference/react/act#troubleshooting
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
