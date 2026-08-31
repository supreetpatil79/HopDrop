import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../shared/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['DM Sans', 'sans-serif']
      },
      colors: {
        primary: '#0F766E',
        'primary-dark': '#115E59',
        surface: '#FFFFFF',
        'surface-alt': '#F4F7FB',
        text: '#0F172A',
        'text-muted': '#52607A',
        border: '#D7E0EA',
        dark: '#0B1220',
        'dark-surface': '#111827'
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '18px',
        xl: '28px'
      }
    }
  },
  plugins: []
} satisfies Config;
