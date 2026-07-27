/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#F9F3F0',
        bg: '#F9F3F0',
        primary: {
          DEFAULT: '#00271D',
          dark: '#001a13',
          light: '#00A77C',
        },
        secondary: {
          DEFAULT: '#00A77C',
          light: '#33b996',
          dark: '#008563',
        },
        accent: {
          DEFAULT: '#00A77C',
          hover: '#008b67',
        },
        gold: {
          DEFAULT: '#C69B26',
          light: '#d6b14d',
          dark: '#a17e1e',
        },
        mainText: '#00271D',
        textPrimary: '#00271D',
        link: '#00A77C',
        brand: {
          primary: '#00271D',
          secondary: '#00A77C',
          accent: '#00A77C',
          gold: '#C69B26',
          bg: '#F9F3F0',
          text: '#00271D',
          link: '#00A77C',
        },
        emerald: {
          50: '#e0f2ec',
          100: '#d1f0e4',
          200: '#33b996',
          300: '#33b996',
          400: '#1ab089',
          500: '#00A77C',
          600: '#008b67',
          700: '#00271D',
          800: '#00271D',
          900: '#001a13',
          950: '#00150f',
        },
        slate: {
          950: '#00271D',
        }
      },
      fontFamily: {
        sans: ['Tenon', 'Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        body: ['Tenon', 'Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Korolev', 'Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        primary: ['Tenon', 'Plus Jakarta Sans', 'sans-serif'],
      },
      fontSize: {
        'h1': ['72px', { lineHeight: '1.1', fontWeight: '700' }],
        'h2': ['32px', { lineHeight: '1.25', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '1.5' }],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
        full: '9999px',
      }
    },
  },
  plugins: [],
}
