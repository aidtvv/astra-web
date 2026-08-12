/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#fa2d48', hover: '#e0243d', soft: '#ffeef0' },
        sidebar: '#1d1d1f',
        appbg: '#ffffff',
      },
      // Design specifies `hover:scale-1.02`, which is not a default Tailwind
      // scale key — add the token so the utility generates real CSS.
      scale: {
        '1.02': '1.02',
      },
      fontFamily: {
        sans: ['SF Pro Display', 'SF Pro Text', '-apple-system', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
