import { ThemedSider } from '@refinedev/antd';
import type { RefineThemedLayoutSiderProps } from '@refinedev/antd';
import { Menu } from 'antd';
import { useTranslation } from 'react-i18next';

// Top-level resource names (App.tsx's resources array) clustered into
// section headers, rendered via antd's Menu.ItemGroup above the resources'
// own submenus - one more layer above the per-resource submenu grouping.
const SECTIONS: { labelKey: string; resourceKeys: string[] }[] = [
  { labelKey: 'sections.content', resourceKeys: ['content', 'geodata'] },
  { labelKey: 'sections.people', resourceKeys: ['community', 'moderation'] },
  { labelKey: 'sections.configuration', resourceKeys: ['master-data', 'locations', 'settings'] },
];

export const GroupedSider = (props: RefineThemedLayoutSiderProps) => {
  const { t } = useTranslation('resources');

  return (
    <ThemedSider
      {...props}
      render={({ items, logout }) => {
        // Refine keys top-level items by route ("/content"), not resource name.
        const byKey = new Map(items.map((item) => [String(item.key).replace(/^\//, ''), item]));
        const sections = SECTIONS.map(({ labelKey, resourceKeys }) => {
          const sectionItems = resourceKeys.map((key) => byKey.get(key)).filter((item) => item !== undefined);
          if (sectionItems.length === 0) return null;
          return (
            <Menu.ItemGroup key={labelKey} title={t(labelKey)}>
              {sectionItems}
            </Menu.ItemGroup>
          );
        }).filter((section) => section !== null);

        return [...sections, logout];
      }}
    />
  );
};
