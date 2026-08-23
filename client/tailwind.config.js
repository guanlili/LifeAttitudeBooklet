/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF6F0',
        'paper-deep': '#F2EBE0',
        ink: '#2B2622',
        'ink-soft': '#6F655B',
        coral: '#E8674A',
        'coral-deep': '#CF5236',
        teal: '#7FA8A0',
        'teal-deep': '#5F8880',
        mist: '#7EA3ED',
        'mist-light': '#D4E3F6',
        cream: '#FFF9E9',
        star: '#E9C46A',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Songti SC"', 'serif'],
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
      },
      boxShadow: {
        page: '0 1px 2px rgba(43,38,34,0.06), 0 6px 18px rgba(43,38,34,0.07)',
        lift: '0 2px 4px rgba(43,38,34,0.08), 0 10px 28px rgba(43,38,34,0.12)',
        card: '0 2px 8px rgba(43,38,34,0.05)',
        'card-hover': '0 4px 14px rgba(43,38,34,0.10)',
      },
      keyframes: {
        'dot-bounce': {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '40%': { transform: 'translateY(-4px)', opacity: '1' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
      },
      animation: {
        'dot-bounce': 'dot-bounce 1.2s ease-in-out infinite',
        'rise-in': 'rise-in 0.35s ease-out both',
        'fade-in': 'fade-in 0.25s ease-out both',
        float: 'float 3.5s ease-in-out infinite',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34,1.56,0.64,1)',
      },
    },
  },
  plugins: [],
};
