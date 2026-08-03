/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        paper: '#ffffff',
        canvas: '#fafaf9',
        line: '#d6d3d1',
        muted: '#57534e',
        brand: {
          DEFAULT: '#166534',
          dark: '#14532d',
          soft: '#dcfce7',
        },
        accent: {
          DEFAULT: '#d97706',
          dark: '#92400e',
          soft: '#fef3c7',
        },
        info: {
          DEFAULT: '#1d4ed8',
          dark: '#1e3a8a',
          soft: '#dbeafe',
        },
        danger: {
          DEFAULT: '#b91c1c',
          dark: '#991b1b',
          soft: '#fee2e2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'page-x': '2rem',
        'page-y': '2rem',
        section: '2.25rem',
        panel: '2rem',
        field: '1.25rem',
      },
      boxShadow: {
        panel: '0 1px 2px rgb(17 24 39 / 0.06), 0 14px 36px rgb(17 24 39 / 0.06)',
      },
    },
  },
  plugins: [],
}
