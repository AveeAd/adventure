import { theme, type ThemeConfig } from 'antd';

// Same palette as apps/public/src/styles.css's @theme block - one brand,
// two theming systems (Tailwind tokens there, AntD ConfigProvider here).
const primary = {
  50: '#f1f7f3',
  100: '#dcebe1',
  300: '#8ebe9d',
  400: '#5c9a76',
  600: '#2f6b4f',
  700: '#234f3b',
  900: '#163024',
};

const stone = {
  50: '#fafaf9',
  100: '#f5f5f4',
  200: '#e7e5e4',
  700: '#44403c',
  800: '#292524',
  900: '#1c1917',
  950: '#0c0a09',
};

const fontFamily = '"InterVariable", ui-sans-serif, system-ui, sans-serif';
const borderRadius = 8;

export const lightTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: primary[600],
    colorInfo: primary[600],
    colorLink: primary[600],
    colorBgLayout: stone[50],
    colorBorder: stone[200],
    borderRadius,
    fontFamily,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#ffffff',
      bodyBg: stone[50],
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: stone[700],
      itemHoverColor: primary[700],
      itemSelectedBg: primary[50],
      itemSelectedColor: primary[700],
    },
    Table: {
      headerBg: stone[50],
      headerColor: stone[700],
      rowHoverBg: primary[50],
    },
  },
};

export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: primary[400],
    colorInfo: primary[400],
    colorLink: primary[400],
    colorBgLayout: stone[950],
    colorBgContainer: stone[900],
    colorBorder: stone[800],
    borderRadius,
    fontFamily,
  },
  components: {
    Layout: {
      headerBg: stone[900],
      siderBg: stone[900],
      bodyBg: stone[950],
    },
    Menu: {
      itemBg: 'transparent',
      itemHoverColor: primary[300],
      itemSelectedBg: primary[900],
      itemSelectedColor: primary[300],
    },
    Table: {
      headerBg: stone[900],
      rowHoverBg: primary[900],
    },
  },
};
