/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Momo Trust Display', 'serif'],
        body: ['Alata', 'sans-serif'],
      },
      colors: {
        brand: {
          primary: '#0077B6',
          secondary: '#00BD48',
          accent: '#90E0EF',
          white: '#FFFFFF',
          dark: '#03045E',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease forwards',
        'slide-up': 'slideUp 0.5s ease forwards',
        'scale-in': 'scaleIn 0.3s ease forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
