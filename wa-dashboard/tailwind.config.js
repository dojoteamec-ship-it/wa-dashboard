/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Sora', 'sans-serif'],
      },
      colors: {
        bg: '#0A0A0F',
        surface: '#111118',
        border: '#1E1E2E',
        accent: '#00FF94',
        accent2: '#00C4FF',
        accent3: '#FF6B35',
        muted: '#4A4A6A',
        text: '#E0E0F0',
      },
    },
  },
  plugins: [],
}
