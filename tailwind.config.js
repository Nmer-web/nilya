/** @type {import('tailwindcss').Config} */
const palette = require('./src/theme/palette.json');

module.exports = {
  content: [
    './src/app/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
    './src/hooks/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'nilya-background': palette.background,
        'nilya-primary': palette.primary,
        'nilya-primary-dark': palette.primaryDark,
        'nilya-primary-soft': palette.primarySoft,
        'nilya-accent': palette.accent,
        'nilya-surface': palette.surface,
        'nilya-surface-2': palette.primarySoft,
        'nilya-text': palette.textPrimary,
        'nilya-secondary': palette.textSecondary,
        'nilya-border': palette.border,
        'nilya-success': palette.success,
        'nilya-error': palette.error,
        'nilya-error-text': palette.errorText,
        'nilya-inverse': palette.background,
      },
    },
  },
  plugins: [],
};
