import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test('login page exposes the credential form', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'Bienvenue !' })).toBeVisible()
  await expect(page.getByLabel('Adresse email')).toBeVisible()
  await expect(page.getByLabel('Mot de passe')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible()
})

test('protected dashboard redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/dashboard')

  await expect(page).toHaveURL(/\/login(?:\?.*)?$/)
  await expect(page.getByRole('heading', { name: 'Bienvenue !' })).toBeVisible()
})