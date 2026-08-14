import { Link } from '@tanstack/react-router'
import { Compass, MapPinOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getRequestUrl, setResponseStatus } from '@tanstack/react-start/server'
import { Button } from './Button'
import { Container } from './Container'
import { buildMeta } from '../lib/seo'

export function NotFound() {
  // TanStack Start's router doesn't set the HTTP status code for an
  // unmatched route on its own (confirmed against the installed
  // @tanstack/react-router - only its in-browser `stores.statusCode`
  // reflects notFound/error, which doesn't affect the actual SSR Response)
  // - the component sets it itself, guarded to only run on the server the
  // way apps/public/src/lib/auth/api.ts's isServer split does, since
  // setResponseStatus throws outside a request context.
  const isServer = typeof document === 'undefined'
  if (isServer) setResponseStatus(404)

  const { t } = useTranslation()
  const meta = buildMeta({
    title: t('common:seo.notFound.title'),
    description: t('common:seo.notFound.description'),
    // The actual requested path, not a hardcoded '/' - a noindex page still
    // shouldn't claim a canonical URL that isn't itself.
    path: isServer ? getRequestUrl().pathname : window.location.pathname,
    noindex: true,
  })

  return (
    <Container className="flex flex-col items-center gap-6 py-24 text-center">
      {meta.meta.map((tag, i) =>
        typeof tag.title === 'string' ? <title key={i}>{tag.title}</title> : <meta key={i} {...tag} />,
      )}
      {meta.links.map((link, i) => (
        <link key={i} {...link} />
      ))}

      <MapPinOff className="h-12 w-12 text-primary-600 dark:text-primary-400" strokeWidth={1.5} />
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{t('common:seo.notFound.heading')}</h1>
      <p className="max-w-md text-stone-600 dark:text-stone-400">{t('common:seo.notFound.body')}</p>
      <Link to="/">
        <Button variant="primary">
          <Compass className="h-4 w-4" /> {t('common:seo.notFound.backHome')}
        </Button>
      </Link>
    </Container>
  )
}
