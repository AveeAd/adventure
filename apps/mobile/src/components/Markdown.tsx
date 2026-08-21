import { Platform, useColorScheme } from 'react-native';
import RNMarkdown from 'react-native-markdown-display';

// Wraps react-native-markdown-display (RN equivalent of apps/public's
// MarkdownContent.tsx, which just applies Tailwind's typography "prose"
// plugin) for adventure-page/trip-report content. RN has no equivalent
// plugin - the library takes a plain style object per AST node type, not
// className, so every node type prose covers for free on web (headings,
// paragraph spacing, lists, blockquotes, code, hr, tables, links) is
// styled by hand here instead, kept in sync with tailwind.config.js's
// primary/accent scale rather than pulled in via NativeWind.
const LIGHT = {
  text: '#1c3f30',
  heading: '#163024',
  link: '#a3502f',
  muted: '#3d5c4e',
  border: 'rgba(35, 79, 59, 0.16)',
  codeBg: 'rgba(35, 79, 59, 0.06)',
  quoteBg: 'rgba(35, 79, 59, 0.05)',
};
const DARK = {
  text: '#dcebe1',
  heading: '#f1f7f3',
  link: '#dd7c4f',
  muted: '#8ebe9d',
  border: 'rgba(255, 255, 255, 0.14)',
  codeBg: 'rgba(255, 255, 255, 0.06)',
  quoteBg: 'rgba(255, 255, 255, 0.04)',
};

const MONOSPACE = Platform.select({ ios: { fontFamily: 'Courier' }, default: { fontFamily: 'monospace' } });

export function Markdown({ children }: { children: string }) {
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? DARK : LIGHT;

  return (
    <RNMarkdown
      style={{
        body: { color: c.text, fontSize: 15, lineHeight: 23 },
        paragraph: { marginTop: 0, marginBottom: 12 },

        heading1: { color: c.heading, fontWeight: '700', fontSize: 23, marginTop: 4, marginBottom: 10 },
        heading2: { color: c.heading, fontWeight: '700', fontSize: 20, marginTop: 18, marginBottom: 8 },
        heading3: { color: c.heading, fontWeight: '600', fontSize: 18, marginTop: 16, marginBottom: 6 },
        heading4: { color: c.heading, fontWeight: '600', fontSize: 16, marginTop: 14, marginBottom: 6 },
        heading5: { color: c.heading, fontWeight: '600', fontSize: 15, marginTop: 12, marginBottom: 4 },
        heading6: { color: c.heading, fontWeight: '600', fontSize: 14, marginTop: 12, marginBottom: 4 },

        strong: { fontWeight: '700', color: c.heading },
        em: { fontStyle: 'italic' },
        s: { textDecorationLine: 'line-through', color: c.muted },

        link: { color: c.link, textDecorationLine: 'none', fontWeight: '500' },

        bullet_list: { marginBottom: 12 },
        ordered_list: { marginBottom: 12 },
        list_item: { marginBottom: 4 },
        bullet_list_icon: { color: c.link, marginLeft: 2, marginRight: 8 },
        ordered_list_icon: { color: c.link, marginLeft: 2, marginRight: 8, fontWeight: '600' },

        blockquote: {
          backgroundColor: c.quoteBg,
          borderColor: c.link,
          borderLeftWidth: 3,
          borderRadius: 6,
          marginVertical: 10,
          marginLeft: 0,
          paddingVertical: 8,
          paddingHorizontal: 12,
        },

        code_inline: {
          ...MONOSPACE,
          fontSize: 13.5,
          color: c.text,
          backgroundColor: c.codeBg,
          borderWidth: 0,
          paddingHorizontal: 5,
          paddingVertical: 1,
          borderRadius: 4,
        },
        code_block: {
          ...MONOSPACE,
          fontSize: 13.5,
          color: c.text,
          backgroundColor: c.codeBg,
          borderWidth: 0,
          borderRadius: 8,
          padding: 12,
          marginVertical: 10,
        },
        fence: {
          ...MONOSPACE,
          fontSize: 13.5,
          color: c.text,
          backgroundColor: c.codeBg,
          borderWidth: 0,
          borderRadius: 8,
          padding: 12,
          marginVertical: 10,
        },

        hr: { backgroundColor: c.border, height: 1, marginVertical: 16 },

        table: { borderWidth: 1, borderColor: c.border, borderRadius: 6, marginVertical: 10 },
        th: { padding: 6, fontWeight: '600', color: c.heading },
        tr: { borderBottomWidth: 1, borderColor: c.border },
        td: { padding: 6 },

        image: { borderRadius: 8, marginVertical: 10 },
      }}
    >
      {children}
    </RNMarkdown>
  );
}
