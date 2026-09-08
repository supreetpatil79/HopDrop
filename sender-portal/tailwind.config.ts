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
        // Hitch Sender — Orange brand
        brand: {
          DEFAULT: '#FF5C28',
          light: '#FF7A50',
          dark: '#E04520',
          muted: '#FFF0EB',
          subtle: '#FFF7F4'
        },
        // Warm neutrals — NOT cold zinc
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
        // Keep existing refs working
        primary: '#FF5C28',
        'primary-dark': '#E04520',
        surface: '#FFFFFF',
        'surface-alt': '#FAFAF8',
        text: '#1A1916',
        'text-muted': '#706F6B',
        border: '#E8E6E1',
        dark: '#0F0E0B',
        'dark-surface': '#1C1A16'
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '22px',
        '2xl': '28px'
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 24px -8px rgba(0,0,0,0.10), 0 1px 3px 0 rgba(0,0,0,0.04)',
        'brand': '0 0 0 3px rgba(255,92,40,0.15)',
        'brand-lg': '0 8px 24px -4px rgba(255,92,40,0.30)',
        'modal': '0 24px 48px -12px rgba(0,0,0,0.18)'
      },
      keyframes: {
        'ticker': { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        'pulse-dot': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        'route-travel': {
          '0%': { left: '0%', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { left: '100%', opacity: '0' }
        }
      },
      animation: {
        'ticker': 'ticker 28s linear infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'route-travel': 'route-travel 2.5s ease-in-out infinite'
      }
    }
  },
  plugins: []
} satisfies Config;
