# End-to-end tests

The browser suite uses Playwright Test and Chromium.

## First run

Install project dependencies and the supported browser build:

```bash
npm install
npm run test:e2e:install
```

Without credentials, `npm run test:e2e` runs the public login and unauthenticated-access checks. Authenticated tests are skipped.

## Authenticated GUI checks

Use a dedicated account in a non-production test database. The test account should be able to access the navigation groups and feature modules you want to cover. Do not use a production account or commit credentials.

For the local app, make sure `.env` points to the test database, then run:

```bash
export E2E_EMAIL='e2e-admin@example.test'
export E2E_PASSWORD='replace-with-test-account-password'
npm run test:e2e
```

Playwright starts `npm run dev` on `http://127.0.0.1:3000` unless `E2E_BASE_URL` is set. To test an already-running instance instead:

```bash
export E2E_BASE_URL='http://127.0.0.1:3000'
npm run test:e2e
```

The setup project signs in through the real login form and stores the resulting browser state under `.playwright/`, which is gitignored. Browser traces, screenshots, and reports are written under `test-results/` and `playwright-report/`.

## Current coverage

- Login form renders and exposes its email/password controls.
- Unauthenticated dashboard access redirects to login.
- Authenticated dashboard renders.
- Every enabled link in the authenticated navigation menus can be opened and renders a page heading.

The navigation checks are smoke tests, not complete functional coverage of every create, edit, delete, upload, approval, and role-specific workflow. Add focused GUI journeys per feature using isolated seeded test data; avoid tests that mutate a shared production database.

Useful commands:

```bash
npm run test:e2e -- --project=public-chromium
npm run test:e2e:ui
npm run test:e2e:report
```