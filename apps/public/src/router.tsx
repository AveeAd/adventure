import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { ErrorPage } from './components/ErrorPage'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // Unlike notFoundComponent, TanStack Router doesn't cascade a route's
    // errorComponent up from child routes to the root - only that route's
    // own errorComponent or this router-level default applies (confirmed
    // against the installed @tanstack/react-router's Match.js). Setting it
    // here, not just on the root route, is what makes every route's errors
    // render our page (and set a real 500 status) instead of the router's
    // built-in dev error overlay.
    defaultErrorComponent: ErrorPage,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
