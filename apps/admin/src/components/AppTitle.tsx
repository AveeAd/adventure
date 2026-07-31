import { ThemedTitle } from '@refinedev/antd';
import type { RefineLayoutThemedTitleProps } from '@refinedev/antd';
import { Mountain } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const AppTitle = (props: RefineLayoutThemedTitleProps) => {
  const { t } = useTranslation('common');

  return (
    <ThemedTitle
      {...props}
      text={t('appName')}
      icon={<Mountain size={22} strokeWidth={2.5} color="#2f6b4f" />}
    />
  );
};
