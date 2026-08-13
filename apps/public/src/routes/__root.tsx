import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router'
import { ClipboardCheck, Flag, FilePlus, LogOut, Menu, Mountain, Settings, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import appCss from '../styles.css?url'
import { Button } from '../components/Button'
import { GradientMesh } from '../components/GradientMesh'
import { NotificationBell } from '../components/NotificationBell'
import { fetchCurrentUser, logout, type CurrentUser } from '../lib/auth/session'
import { useApprovalEligibility } from '../lib/auth/eligibility'
import { fetchAppConfig } from '../lib/app-config'
import '../lib/i18n' // side-effect: initializes the shared i18next instance
import { resolveLocale } from '../lib/i18n/locale'

export const Route = createRootRoute({
  loader: async () => ({ locale: await resolveLocale(), appConfig: await fetchAppConfig() }),
  head: ({ loaderData }) => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: loaderData?.appConfig.name ?? 'Adventure Nepal',
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
  'flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-primary-700 dark:text-stone-300 dark:hover:text-primary-400'

// A filled waypoint dot marks the current stop on the trail - on-theme for
// a map/trail app, and a clearer active-state signal than a color change
// alone once the surrounding links carry more visual weight (buttons, avatar).
function WaypointDot({ show }: { show: boolean }) {
  return (
    <span
      className={`h-1.5 w-1.5 rounded-full bg-accent-500 transition-opacity ${show ? 'opacity-100' : 'opacity-0'}`}
      aria-hidden="true"
    />
  )
}

function PrimaryNavLink({
  to,
  children,
  onClick,
}: {
  to: string
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Link to={to} onClick={onClick} className={navLinkClass}>
      {({ isActive }) => (
        <>
          <WaypointDot show={isActive} />
          {children}
        </>
      )}
    </Link>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { t } = useTranslation()
  const { locale, appConfig } = Route.useLoaderData()

  return (
    <html lang={locale}>
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col">
        <GradientMesh />
        <header className="glass-1 sticky top-0 z-10 border-b border-[color:var(--glass-border)] backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
            <Link to="/" className="flex items-center gap-2 text-primary-800 dark:text-primary-300">
              <Mountain className="h-6 w-6" strokeWidth={2.5} />
              <span className="text-lg font-semibold tracking-tight">{appConfig.name}</span>
            </Link>

            <nav className="hidden items-center gap-6 sm:flex">
              <PrimaryNavLink to="/">{t('nav.discover')}</PrimaryNavLink>
              <PrimaryNavLink to="/guides">{t('nav.guides')}</PrimaryNavLink>
              <span className="h-5 w-px bg-stone-200 dark:bg-stone-800" aria-hidden="true" />
              <AuthStatus />
            </nav>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-stone-600 hover:bg-stone-100 sm:hidden dark:text-stone-300 dark:hover:bg-stone-800"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={t('nav.toggleMenu')}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {menuOpen && (
            <div className="glass-1 flex flex-col gap-4 border-t border-[color:var(--glass-border)] px-4 py-4 backdrop-blur-md sm:hidden">
              <nav className="flex flex-col gap-4">
                <PrimaryNavLink to="/" onClick={() => setMenuOpen(false)}>
                  {t('nav.discover')}
                </PrimaryNavLink>
                <PrimaryNavLink to="/guides" onClick={() => setMenuOpen(false)}>
                  {t('nav.guides')}
                </PrimaryNavLink>
              </nav>
              <div className="border-t border-[color:var(--glass-border)] pt-4">
                <AuthStatus stacked />
              </div>
            </div>
          )}
        </header>

        <div className="flex-1">{children}</div>

        <footer className="border-t border-stone-200 py-8 text-center text-sm text-stone-500 dark:border-stone-800 dark:text-stone-400">
          {appConfig.tagline}
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
  const { t } = useTranslation()

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
        <Button size="sm">{t('nav.signIn')}</Button>
      </Link>
    )
  }

  return (
    <span className={stacked ? 'flex flex-col gap-4' : 'flex items-center gap-4'}>
      <NotificationBell />
      <AccountMenu user={user} stacked={stacked} onSignOut={() => setUser(null)} />
    </span>
  )
}

// One avatar replaces what used to be three separate flat links (email,
// guide profile, sign out) - patterned directly on NotificationBell's
// toggle-button + absolute panel so the two dropdowns in this header look
// like they belong to the same design, not two different ones.
function AccountMenu({
  user,
  stacked,
  onSignOut,
}: {
  user: CurrentUser
  stacked: boolean
  onSignOut: () => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const initial = user.email[0]?.toUpperCase() ?? '?'
  const { t } = useTranslation()
  const { canVote } = useApprovalEligibility()

  useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function handleSignOut() {
    setOpen(false)
    await logout()
    onSignOut()
    window.location.reload()
  }

  // On the mobile stacked menu there's no room for a floating panel to make
  // sense - just lay the same rows out inline instead of behind a toggle.
  if (stacked) {
    return (
      <div className="flex flex-col gap-3">
        <Link to="/users/$id" params={{ id: user.userId }} className="truncate text-sm text-stone-500 hover:text-primary-700 dark:text-stone-400 dark:hover:text-primary-400">
          {user.email}
        </Link>
        <Link to="/adventures/new" className={navLinkClass}>
          <FilePlus className="h-4 w-4" /> {t('nav.contribute')}
        </Link>
        <Link to="/account" className={navLinkClass}>
          <Settings className="h-4 w-4" /> {t('nav.account')}
        </Link>
        <Link to="/account/guide-profile" className={navLinkClass}>
          <UserRound className="h-4 w-4" /> {t('nav.guideProfile')}
        </Link>
        {canVote && (
          <Link to="/review-queue" className={navLinkClass}>
            <ClipboardCheck className="h-4 w-4" /> {t('nav.reviewQueue')}
          </Link>
        )}
        {canVote && (
          <Link to="/reports" className={navLinkClass}>
            <Flag className="h-4 w-4" /> {t('nav.reportsQueue')}
          </Link>
        )}
        <button type="button" onClick={handleSignOut} className={`${navLinkClass} text-left`}>
          <LogOut className="h-4 w-4" /> {t('nav.signOut')}
        </button>
      </div>
    )
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-label={t('nav.accountMenu')}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
      >
        {initial}
      </button>

      {open && (
        <div className="glass-3 absolute right-0 z-20 mt-2 w-56 rounded-lg border border-[color:var(--glass-border)] py-1 backdrop-blur-lg">
          <Link
            to="/users/$id"
            params={{ id: user.userId }}
            onClick={() => setOpen(false)}
            className="block truncate border-b border-[color:var(--glass-border)] px-3 py-2 text-sm text-stone-500 hover:bg-stone-50 hover:text-primary-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-primary-400"
          >
            {user.email}
          </Link>
          <Link
            to="/adventures/new"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            <FilePlus className="h-4 w-4" /> {t('nav.contribute')}
          </Link>
          <Link
            to="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            <Settings className="h-4 w-4" /> {t('nav.account')}
          </Link>
          <Link
            to="/account/guide-profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            <UserRound className="h-4 w-4" /> {t('nav.guideProfile')}
          </Link>
          {canVote && (
            <Link
              to="/review-queue"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              <ClipboardCheck className="h-4 w-4" /> {t('nav.reviewQueue')}
            </Link>
          )}
          {canVote && (
            <Link
              to="/reports"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              <Flag className="h-4 w-4" /> {t('nav.reportsQueue')}
            </Link>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            <LogOut className="h-4 w-4" /> {t('nav.signOut')}
          </button>
        </div>
      )}
    </div>
  )
}
