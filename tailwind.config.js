/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366F1',
          light: '#818CF8',
          dark: '#4F46E5',
        },
        secondary: {
          DEFAULT: '#F50057',
        },
        background: {
          DEFAULT: '#F8FAFC',
          paper: '#FFFFFF',
        },
        text: {
          primary: '#1E293B',
          secondary: '#64748B',
        },
        destructive: {
          DEFAULT: "#ef4444",
        },
        muted: {
          DEFAULT: "#f1f5f9",
          foreground: "#64748b",
        },
      },
      borderRadius: {
        DEFAULT: '0.75rem',
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  corePlugins: {
    preflight: false, // Avoid conflicts with MUI
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
  important: '#shadcn-ui', // Scoped to avoid conflicts with MUI
}