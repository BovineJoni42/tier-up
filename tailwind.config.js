/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg:      '#0d0d0f',
          surface: '#16161a',
          card:    '#1e1e24',
          border:  '#2a2a33',
          muted:   '#3a3a47',
          text:    '#e2e2e8',
          sub:     '#8888a0',
          accent:  '#7c3aed',
          glow:    '#a855f7',
        },
        tier: {
          s: '#f59e0b',
          a: '#22c55e',
          b: '#3b82f6',
          c: '#a855f7',
          d: '#ef4444',
          f: '#6b7280',
        },
      },
      boxShadow: {
        glow:   '0 0 20px rgba(168,85,247,0.35)',
        'glow-s':'0 0 12px rgba(245,158,11,0.5)',
      },
      fontFamily: {
        display: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
      },
    },
  },
  plugins: [],
}

