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
        background: 'var(--background)',
        bg: 'var(--background)',
        primary: {
          DEFAULT: 'var(--primary)',
          dark: '#001a13',
          light: 'var(--accent)',
        },
        secondary: {
          DEFAULT: 'var(--accent)',
          light: '#33b996',
          dark: '#008563',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-dark)',
        },
        gold: {
          DEFAULT: 'var(--gold)',
          light: '#d6b14d',
          dark: '#a17e1e',
        },
        mainText: 'var(--primary)',
        textPrimary: 'var(--primary)',
        link: 'var(--accent)',
        brand: {
          primary: 'var(--primary)',
          secondary: 'var(--accent)',
          accent: 'var(--accent)',
          gold: 'var(--gold)',
          bg: 'var(--background)',
          text: 'var(--primary)',
          link: 'var(--accent)',
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
          950: 'var(--primary)',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        body: ['DM Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['DM Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        primary: ['DM Sans', 'system-ui', 'sans-serif'],
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
