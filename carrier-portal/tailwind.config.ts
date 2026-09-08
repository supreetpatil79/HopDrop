import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../shared/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Instrument Serif', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      colors: {
        // Hitch Carrier — Blue brand
        brand: {
          DEFAULT: '#2563EB',
          light: '#3B82F6',
          dark: '#1D4ED8',
          muted: '#EFF6FF',
          subtle: '#F5F9FF'
        },
        // Same warm neutrals as sender
        warm: {
          50:  '#FAFAF8',
          100: '#F5F4F1',
          200: '#EAE8E2',
          300: '#D6D3CB',
          400: '#B8B3A8',
          500: '#918D84',
          600: '#6E6A62',
          700: '#4E4A43',
          800: '#33302B',
          900: '#1C1A16',
          950: '#0F0E0B'
        },
        primary: '#2563EB',
        'primary-dark': '#1D4ED8',
        surface: '#FFFFFF',
        'surface-alt': '#FAFAF8',
        text: '#1A1916',
        'text-muted': '#706F6B',
        border: '#E8E6E1',
        dark: '#0F0E0B',
        'dark-surface': '#1C1A16'
      },
      borderRadius: {
        sm: '6px', md: '10px', lg: '16px', xl: '22px', '2xl': '28px'
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 24px -8px rgba(0,0,0,0.10), 0 1px 3px 0 rgba(0,0,0,0.04)',
        'brand': '0 0 0 3px rgba(37,99,235,0.15)',
        'brand-lg': '0 8px 24px -4px rgba(37,99,235,0.30)',
        'modal': '0 24px 48px -12px rgba(0,0,0,0.18)'
      }
    }
  },
  plugins: []
} satisfies Config;
