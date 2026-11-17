import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        stitch: {
          navy: {
            DEFAULT: '#1B365D',
            dark: '#0F2342',
            light: '#2B4C7E',
            tint: '#EBF1F8',
          },
          terracotta: {
            DEFAULT: '#C84B31',
            hover: '#A83820',
            light: '#FDECE8',
          },
          emergency: {
            DEFAULT: '#DC2626',
            hover: '#B91C1C',
            surface: '#FEF2F2',
            border: '#FCA5A5',
          },
          sla: {
            resolved: '#059669',
            resolvedBg: '#ECFDF5',
            inProgress: '#2563EB',
            inProgressBg: '#EFF6FF',
            review: '#D97706',
            reviewBg: '#FFFBEB',
            submitted: '#475569',
            submittedBg: '#F1F5F9',
          },
          surface: {
            canvas: '#F8FAFC',
            card: '#FFFFFF',
            muted: '#F1F5F9',
            border: '#E2E8F0',
          },
          ink: {
            primary: '#0F172A',
            secondary: '#334155',
            muted: '#64748B',
          },
        },
        primary: {
          DEFAULT: '#1B365D',
          hover: '#142947',
          container: '#1e3a8a',
        },
        secondary: {
          DEFAULT: '#006a61',
          container: '#86f2e4',
        },
        emergency: {
          DEFAULT: '#DC2626',
          hover: '#B91C1C',
          container: '#ffdad6',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'Plus Jakarta Sans',
          'Noto Sans',
          'Noto Sans Devanagari',
          'Noto Sans Telugu',
          'Noto Sans Tamil',
          'system-ui',
          'sans-serif',
        ],
        display: ['Merriweather', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        hero: ['2.25rem', { lineHeight: '2.75rem', fontWeight: '800', letterSpacing: '-0.02em' }],
        h1: ['1.75rem', { lineHeight: '2.25rem', fontWeight: '700', letterSpacing: '-0.015em' }],
        h2: ['1.375rem', { lineHeight: '1.875rem', fontWeight: '700' }],
        h3: ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        body: ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        label: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '600', letterSpacing: '0.01em' }],
        kicker: ['0.75rem', { lineHeight: '1rem', fontWeight: '700', letterSpacing: '0.08em' }],
      },
      borderRadius: {
        'stitch-card': '16px',
        'stitch-btn': '12px',
        'stitch-pill': '9999px',
      },
      boxShadow: {
        'stitch-sm': '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
        'stitch-md': '0 4px 12px -2px rgba(27, 54, 93, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        'stitch-floating': '0 -4px 20px rgba(15, 23, 42, 0.12), 0 8px 24px rgba(220, 38, 38, 0.18)',
      },
      spacing: {
        touch: '48px',
      },
    },
  },
  plugins: [],
};

export default config;

