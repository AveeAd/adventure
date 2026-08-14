import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestUrl, setResponseStatus } from '@tanstack/react-start/server'

// createIsomorphicFn's compiler transform drops whichever branch doesn't
// match the current build target (client vs server) before bundling - the
// dropped branch's now-unused `@tanstack/react-start/server` import gets
// tree-shaken away with it, which is what actually satisfies the client
// bundle's import-protection check (a plain `typeof document === 'undefined'`
// runtime guard around a top-level import of that module does NOT: the
// import itself is still statically present in the client bundle graph and
// gets rejected at build time, confirmed by reading
// @tanstack/start-plugin-core's handleCreateIsomorphicFn.js and its
// import-protection plugin directly).
export const setHttpStatus = createIsomorphicFn()
  .server((code: number) => setResponseStatus(code))
  .client((_code: number) => {})

export const getCurrentPath = createIsomorphicFn()
  .server(() => getRequestUrl().pathname)
  .client(() => window.location.pathname)
