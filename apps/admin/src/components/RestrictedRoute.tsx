import { CanAccess } from '@refinedev/core';
import { Result } from 'antd';
import { useTranslation } from 'react-i18next';

// MILESTONE_3.md §2.1/§9.2: backs up accessControlProvider's hidden
// Create/Edit buttons with an actual route guard, so a moderator who
// navigates straight to a restricted URL (e.g. /users/edit/:id) sees a
// clear "not authorized" page instead of a form that fails to save.
export function RestrictedRoute({
  resource,
  action,
  children,
}: {
  resource: string;
  action: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation('common');
  return (
    <CanAccess
      resource={resource}
      action={action}
      fallback={<Result status="403" title={t('accessControl.title')} subTitle={t('accessControl.subtitle')} />}
    >
      {children}
    </CanAccess>
  );
}
