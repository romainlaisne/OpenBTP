import { test as setup, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const authFile = path.resolve('.playwright/auth-state.json')

setup('sign in through the GUI', async ({ page }) => {
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD

  setup.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated GUI tests.')

  await page.goto('/login')
  await page.getByLabel('Adresse email').fill(email!)
  await page.getByLabel('Mot de passe').fill(password!)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/)
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible()

  await mkdir(path.dirname(authFile), { recursive: true })
  await page.context().storageState({ path: authFile })
})