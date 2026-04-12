import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['DM Sans', 'sans-serif']
      },
      colors: {
        primary: '#00C853',
        'primary-dark': '#00A046',
        surface: '#FFFFFF',
        'surface-alt': '#F8F9FA',
        text: '#111827',
        'text-muted': '#6B7280',
        border: '#E5E7EB',
        dark: '#0F1117',
        'dark-surface': '#1A1D23'
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px'
      }
    }
  },
  plugins: []
} satisfies Config;
