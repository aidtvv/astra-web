/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: 'var(--accent-color)', hover: 'var(--accent-hover)', soft: 'var(--accent-muted)' },
        appbg: 'var(--bg-primary)',
        surface: 'var(--surface-color)',
        'surface-elevated': 'var(--surface-elevated)',
        sidebar: 'var(--bg-secondary)',
      },
      backgroundColor: {
        'glass': 'var(--glass-bg)',
        'card-glass': 'var(--card-glass-bg)',
        'hover': 'var(--hover-bg)',
      },
      borderColor: {
        'theme': 'var(--border-color)',
        'glass': 'var(--glass-border)',
        'card-glass': 'var(--card-glass-border)',
      },
      textColor: {
        'theme': 'var(--text-primary)',
        'secondary': 'var(--text-secondary)',
        'muted': 'var(--text-muted)',
        'accent': 'var(--accent-color)',
      },
      fontFamily: {
        sans: ['SF Pro Display', 'SF Pro Text', '-apple-system', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      scale: {
        '1.02': '1.02',
      },
    },
  },
  plugins: [],
};
