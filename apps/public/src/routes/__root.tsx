import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router'
import { Menu, Mountain, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import appCss from '../styles.css?url'
import { Button } from '../components/Button'
import { fetchCurrentUser, logout, type CurrentUser } from '../lib/auth/session'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Adventure Nepal',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

const navLinkClass =
  'text-sm font-medium text-stone-600 hover:text-primary-700 dark:text-stone-300 dark:hover:text-primary-400 [&.active]:text-primary-700 dark:[&.active]:text-primary-400'

function RootDocument({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
            <Link to="/" className="flex items-center gap-2 text-primary-800 dark:text-primary-300">
              <Mountain className="h-6 w-6" strokeWidth={2.5} />
              <span className="text-lg font-semibold tracking-tight">Adventure Nepal</span>
            </Link>

            <nav className="hidden items-center gap-6 sm:flex">
              <Link to="/" className={navLinkClass}>
                Discover
              </Link>
              <Link to="/guides" className={navLinkClass}>
                Guides
              </Link>
              <AuthStatus />
            </nav>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-stone-600 hover:bg-stone-100 sm:hidden dark:text-stone-300 dark:hover:bg-stone-800"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {menuOpen && (
            <nav className="flex flex-col gap-4 border-t border-stone-200 px-4 py-4 sm:hidden dark:border-stone-800">
              <Link to="/" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                Discover
              </Link>
              <Link to="/guides" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                Guides
              </Link>
              <AuthStatus stacked />
            </nav>
          )}
        </header>

        <div className="flex-1">{children}</div>

        <footer className="border-t border-stone-200 py-8 text-center text-sm text-stone-500 dark:border-stone-800 dark:text-stone-400">
          Adventure Nepal &mdash; a non-commercial map, wiki, and activity log for Nepal, built by contributors.
        </footer>

        <Scripts />
      </body>
    </html>
  )
}

// Session state can't be known during SSR (the access token only ever lives
// in browser memory - see PUBLIC_PAGES.md), so this always renders "Sign in"
// on the server and reconciles client-side after hydration.
function AuthStatus({ stacked = false }: { stacked?: boolean }) {
  const [user, setUser] = useState<CurrentUser | null | 'loading'>('loading')

  useEffect(() => {
    let cancelled = false
    fetchCurrentUser().then((current) => {
      if (!cancelled) setUser(current)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (user === 'loading') {
    return null
  }

  if (!user) {
    return (
      <Link to="/login">
        <Button size="sm">Sign in</Button>
      </Link>
    )
  }

  return (
    <span className={stacked ? 'flex flex-col gap-4' : 'flex items-center gap-4'}>
      <Link to="/adventures/new" className={navLinkClass}>
        New page
      </Link>
      <Link to="/account/guide-profile" className={navLinkClass}>
        Guide profile
      </Link>
      <Link to="/users/$id" params={{ id: user.userId }} className={navLinkClass}>
        {user.email}
      </Link>
      <Button
        variant="secondary"
        size="sm"
        type="button"
        onClick={async () => {
          await logout()
          setUser(null)
          window.location.reload()
        }}
      >
        Sign out
      </Button>
    </span>
  )
}
