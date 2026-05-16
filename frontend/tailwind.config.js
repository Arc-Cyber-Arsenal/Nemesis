/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary - Uses CSS variables set by ThemeContext
        primary: {
          50: 'var(--color-primary-50, #ecfeff)',
          100: 'var(--color-primary-100, #cffafe)',
          200: 'var(--color-primary-200, #a5f3fc)',
          300: 'var(--color-primary-300, #67e8f9)',
          400: 'var(--color-primary-400, #22d3ee)',
          500: 'var(--color-primary-500, #06b6d4)',
          600: 'var(--color-primary-600, #0891b2)',
          700: 'var(--color-primary-700, #0e7490)',
          800: 'var(--color-primary-800, #155e75)',
          900: 'var(--color-primary-900, #164e63)',
          950: 'var(--color-primary-950, #083344)',
        },
        // Neutrals - Vercel style
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          150: '#ededed',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          850: '#1a1a1a',
          900: '#171717',
          950: '#0a0a0a',
        },
        // Severity colors
        severity: {
          critical: '#dc2626', // red-600
          high: '#ea580c',     // orange-600
          medium: '#f59e0b',   // amber-500
          low: '#eab308',      // yellow-500
          info: '#06b6d4',     // cyan-500
        }
      },
      fontFamily: {
        sans: ['Inter var', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'strong': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}
