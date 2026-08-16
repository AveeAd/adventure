/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // OS-driven, no manual toggle - mirrors apps/public's
  // prefers-color-scheme convention (CLAUDE.md "Design system").
  darkMode: 'media',
  theme: {
    extend: {
      // Ported from apps/public/src/styles.css - same pine-green/terracotta
      // palette, kept in sync by hand (see CLAUDE.md "Design system").
      colors: {
        primary: {
          50: '#f1f7f3',
          100: '#dcebe1',
          200: '#b9d7c3',
          300: '#8ebe9d',
          400: '#5c9a76',
          500: '#3d7d5b',
          600: '#2f6b4f',
          700: '#234f3b',
          800: '#1c3f30',
          900: '#163024',
          950: '#0d1f17',
        },
        accent: {
          50: '#fdf4f0',
          100: '#fbe4d9',
          200: '#f6c7ae',
          300: '#eea179',
          400: '#dd7c4f',
          500: '#c1633c',
          600: '#a3502f',
          700: '#833f26',
          800: '#632f1c',
          900: '#452213',
          950: '#2c1509',
        },
      },
    },
  },
  plugins: [],
};
