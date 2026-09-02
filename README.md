# NILYA

NILYA is a premium marketplace for NEW products only. The app is built with Expo SDK 57,
React Native, Expo Router, Supabase, and Stripe.

## Development

Install dependencies and start the development server:

```bash
npm install
npm start
```

Quality gates:

```bash
npm run typecheck
npm run lint
```

## NILYA Development on Supabase

The existing Supabase project is the NILYA Development environment. Its project reference,
endpoint URLs, keys, schema, migrations, RLS policies, Realtime setup, Storage objects, and real
data remain unchanged by the consumer-brand rename.

Local CLI configuration intentionally retains the historical `project_id = "sawa"` value so
existing local development data is not recreated under a second identifier.

Native confirmation and password-recovery links now use `nilya://auth-callback`. Add that exact
URL under **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**. Keep
`sawa://auth-callback` during the installed-app transition; remove it only after all old builds and
previously sent auth emails no longer need it.

Copy `.env.example` to `.env` for local credentials. Never commit `.env`, service-role keys,
Stripe secrets, webhook secrets, passwords, tokens, or payment credentials.

## Architecture rules

The repository constitution is in `.specify/memory/constitution.md`. In particular:

- every listing read and write is restricted to NEW products;
- real Supabase/authenticated data is used instead of fabricated marketplace content;
- Auth, Supabase, Realtime, and Stripe contracts are not redesigned in passing;
- typecheck and lint must pass before completion is claimed.
