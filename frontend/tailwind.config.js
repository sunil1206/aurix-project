/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '420px',          // for very small phones, intermediate layouts
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        'fade-in':       { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'slide-in-top':  { '0%': { transform: 'translateY(-8px)', opacity: 0 },
                           '100%': { transform: 'translateY(0)', opacity: 1 } },
      },
      animation: {
        'fade-in':      'fade-in 300ms ease-out',
        'slide-in-top': 'slide-in-top 200ms ease-out',
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      })
    },
  ],
}
