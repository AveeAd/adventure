import { Link } from '@tanstack/react-router'
import { Compass, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getRequestUrl, setResponseStatus } from '@tanstack/react-start/server'
import { Button } from './Button'
import { Container } from './Container'
import { buildMeta } from '../lib/seo'

export function ErrorPage() {
  // See NotFound.tsx for why the status code has to be set here rather than
  // falling out of the router automatically.
  const isServer = typeof document === 'undefined'
  if (isServer) setResponseStatus(500)

  const { t } = useTranslation()
  const meta = buildMeta({
    title: t('common:seo.serverError.title'),
    description: t('common:seo.serverError.description'),
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

      <TriangleAlert className="h-12 w-12 text-accent-600 dark:text-accent-400" strokeWidth={1.5} />
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{t('common:seo.serverError.heading')}</h1>
      <p className="max-w-md text-stone-600 dark:text-stone-400">{t('common:seo.serverError.body')}</p>
      <Link to="/">
        <Button variant="primary">
          <Compass className="h-4 w-4" /> {t('common:seo.serverError.backHome')}
        </Button>
      </Link>
    </Container>
  )
}
