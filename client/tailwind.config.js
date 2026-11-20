/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        cormorant: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      colors: {
        sofa: {
          bg: '#10100F',
          secondary: '#1B1A18',
          surface: '#24221F',
          surfaceHover: '#2E2B27',
          cream: '#F5F0E8',
          gold: '#C6A76A',
          goldLight: '#D8B98A',
          goldDark: '#A6874A',
          muted: '#A9A39A',
          border: '#33302B',
          borderLight: '#444039',
        },
      },
      boxShadow: {
        'luxury': '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 30px 0 rgba(198, 167, 106, 0.08)',
        'gold-glow': '0 0 25px rgba(198, 167, 106, 0.25)',
        'gold-glow-lg': '0 0 45px rgba(198, 167, 106, 0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
