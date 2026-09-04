import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand primary — bubblegum/flamingo pink from the logo
        primary: {
          50:  '#fff0f5',
          100: '#ffe0ec',
          200: '#ffc2d8',
          300: '#ff99bb',
          400: '#f9749f',
          500: '#f4a7be', // ← brand pink (logo background)
          600: '#e8749a', // deeper for hover / CTA
          700: '#d44f7a',
          800: '#b33360',
          900: '#8f1f48',
          950: '#5c0d2c',
        },
        // Warm cream — page section backgrounds
        cream: {
          50:  '#fffaf8',
          100: '#fff4f0',
          200: '#ffe8e0',
        },
        // Peach accent — illustration tones
        peach: {
          100: '#fde8dc',
          200: '#fbd0bb',
          300: '#f4a07a',
        },
        // Blush — card tints, borders
        blush: {
          50:  '#fff5f8',
          100: '#ffe6ef',
          200: '#ffcedd',
          300: '#ffb3ca',
        },
        // Sky-blue accent — from the tube illustration
        sky: {
          100: '#daf3fb',
          200: '#a8e4f5',
          300: '#6dcae8',
        },
        surface: {
          50:  '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
        },
      },
      fontFamily: {
        // Battambang for Khmer + Latin body copy
        sans: ['var(--font-battambang)', 'var(--font-nunito)', 'system-ui', 'sans-serif'],
        // Nunito for rounded, playful display headings
        heading: ['var(--font-nunito)', 'var(--font-battambang)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'pink-sm': '0 2px 8px 0 rgba(244, 167, 190, 0.25)',
        'pink-md': '0 4px 16px 0 rgba(244, 167, 190, 0.35)',
        'pink-lg': '0 8px 32px 0 rgba(244, 167, 190, 0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
