import { setupServer } from "msw/node";

/** One MSW server for the whole Vitest run. Tests add their own handlers with `server.use(...)`; any request
 *  without a handler fails the test (see `setup.ts`), so a test can never hit the real network by accident. */
export const server = setupServer();
