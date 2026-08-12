// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/**
 * Only EXPO_PUBLIC_* survives into the JavaScript bundle — anything else reads
 * back undefined at runtime. That makes a `process.env.STRIPE_SECRET_KEY` in
 * app code a silent bug rather than a leak, right up until someone "fixes" it
 * by renaming the variable to EXPO_PUBLIC_STRIPE_SECRET_KEY and ships a secret
 * inside a public binary. Fail the build at the first step instead.
 */
const ENV_MESSAGE =
  'The mobile bundle may only read EXPO_PUBLIC_* variables. Server secrets ' +
  '(service-role, Stripe) belong in Supabase Edge Function secrets, never in app code.';

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'supabase/*'],
  },
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // process.env.SOMETHING
          selector:
            "MemberExpression[computed=false][object.object.name='process'][object.property.name='env'][property.name!=/^EXPO_PUBLIC_/]",
          message: ENV_MESSAGE,
        },
        {
          // process.env['SOMETHING']
          selector:
            "MemberExpression[computed=true][object.object.name='process'][object.property.name='env'][property.value!=/^EXPO_PUBLIC_/]",
          message: ENV_MESSAGE,
        },
      ],
    },
  },
]);
