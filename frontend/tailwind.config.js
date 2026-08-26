/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ficopay: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          cardMuted: '#F8FAFC',
          border: '#E2E8F0',
          borderLight: '#EDF2F7',
          text: '#0F172A',
          textMuted: '#64748B',
          textLight: '#94A3B8',
          primary: {
            DEFAULT: '#6366F1',
            hover: '#4F46E5',
            light: '#EEF2FF',
            tint: '#E0E7FF',
            dark: '#4338CA',
          },
          violet: {
            DEFAULT: '#7C3AED',
            hover: '#6D28D9',
            light: '#F5F3FF',
            tint: '#EDE9FE',
          },
          purple: {
            DEFAULT: '#8B5CF6',
            hover: '#7C3AED',
            light: '#FAF5FF',
            tint: '#F3E8FF',
          },
          cyan: {
            DEFAULT: '#06B6D4',
            light: '#ECFEFF',
            tint: '#CFFAFE',
          },
          emerald: {
            DEFAULT: '#10B981',
            bg: '#ECFDF5',
            text: '#059669',
            border: '#A7F3D0',
          },
          amber: {
            DEFAULT: '#F59E0B',
            bg: '#FFFBEB',
            text: '#D97706',
            border: '#FDE68A',
          },
          rose: {
            DEFAULT: '#F43F5E',
            bg: '#FFF1F2',
            text: '#E11D48',
            border: '#FECDD3',
          }
        },
        surface: {
          50: '#FFFFFF',
          100: '#F8FAFC',
          200: '#F1F5F9',
          300: '#E2E8F0',
          400: '#CBD5E1',
          500: '#94A3B8',
          600: '#64748B',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'ficopay': '0 2px 16px -2px rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.02)',
        'ficopay-hover': '0 10px 28px -4px rgba(99, 102, 241, 0.08), 0 2px 8px -2px rgba(15, 23, 42, 0.03)',
        'ficopay-card': '0 4px 20px -2px rgba(15, 23, 42, 0.03), 0 1px 2px 0 rgba(15, 23, 42, 0.02)',
        'violet-glow': '0 4px 20px -2px rgba(124, 58, 237, 0.25)',
        'indigo-glow': '0 4px 20px -2px rgba(99, 102, 241, 0.25)',
      }
    },
  },
  plugins: [],
}
