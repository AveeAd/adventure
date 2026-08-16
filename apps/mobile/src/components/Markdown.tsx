import { useColorScheme } from 'react-native';
import RNMarkdown from 'react-native-markdown-display';

// Wraps react-native-markdown-display (RN equivalent of apps/public's
// MarkdownContent.tsx, a react-markdown wrapper) for adventure-page/trip-
// report content. The library takes a plain RN style object per node type,
// not className, so the palette is hardcoded here rather than via
// NativeWind - these hex values match tailwind.config.js's primary/accent
// scale, kept in sync by hand.
const LIGHT_COLORS = { text: '#1c3f30', heading: '#163024', link: '#a3502f' };
const DARK_COLORS = { text: '#dcebe1', heading: '#f1f7f3', link: '#dd7c4f' };

export function Markdown({ children }: { children: string }) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  return (
    <RNMarkdown
      style={{
        body: { color: colors.text, fontSize: 15, lineHeight: 22 },
        heading1: { color: colors.heading, fontWeight: '700', fontSize: 22 },
        heading2: { color: colors.heading, fontWeight: '700', fontSize: 19 },
        heading3: { color: colors.heading, fontWeight: '600', fontSize: 17 },
        link: { color: colors.link },
      }}
    >
      {children}
    </RNMarkdown>
  );
}
