/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#fa2d48', hover: '#e0243d', soft: '#ffeef0' },
        sidebar: '#1d1d1f',
        appbg: '#f5f5f7',
      },
      fontFamily: {
        sans: ['SF Pro Display', 'SF Pro Text', '-apple-system', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
