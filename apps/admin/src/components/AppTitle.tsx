import { ThemedTitle } from '@refinedev/antd';
import type { RefineLayoutThemedTitleProps } from '@refinedev/antd';
import { Mountain } from 'lucide-react';
import { useAppConfig } from '../hooks/useAppConfig';

export const AppTitle = (props: RefineLayoutThemedTitleProps) => {
  const { name } = useAppConfig();

  return (
    <ThemedTitle
      {...props}
      text={name}
      icon={<Mountain size={22} strokeWidth={2.5} color="#2f6b4f" />}
    />
  );
};
