import { ThemedTitle } from '@refinedev/antd';
import type { RefineLayoutThemedTitleProps } from '@refinedev/antd';
import { Mountain } from 'lucide-react';

export const AppTitle = (props: RefineLayoutThemedTitleProps) => (
  <ThemedTitle
    {...props}
    text="Adventure Nepal"
    icon={<Mountain size={22} strokeWidth={2.5} color="#2f6b4f" />}
  />
);
