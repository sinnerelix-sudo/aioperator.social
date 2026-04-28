/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Clash Display"', 'system-ui', 'sans-serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#FBFBFC',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          500: '#71717A',
          700: '#3F3F46',
          900: '#09090B',
        },
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          900: '#312E81',
        },
        violet: {
          500: '#8B5CF6',
          600: '#7C3AED',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)',
      },
      boxShadow: {
        'brand-glow': '0 0 0 1px rgba(79,70,229,0.15), 0 12px 40px -10px rgba(79,70,229,0.35)',
        'soft': '0 1px 2px rgba(9,9,11,0.04), 0 4px 12px rgba(9,9,11,0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideDown: {
          '0%': { transform: 'translateY(-12px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
