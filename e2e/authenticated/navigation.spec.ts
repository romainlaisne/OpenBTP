import { test, expect } from '@playwright/test'

const navigationGroups = ['Gestion', 'Documents', 'Organisation', 'Outils']

test.beforeEach(() => {
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
    'Set E2E_EMAIL and E2E_PASSWORD to run authenticated GUI tests.',
  )
})

test('dashboard renders for the signed-in user', async ({ page }) => {
  await page.goto('/dashboard')

  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible()
  await expect(page.getByRole('navigation').getByRole('link', { name: /OpenBTP/ })).toBeVisible()
})

for (const groupName of navigationGroups) {
  test(`GUI navigation opens enabled ${groupName} pages`, async ({ page }) => {
    await page.goto('/dashboard')
    const groupButton = page.getByRole('button', { name: groupName, exact: false })
    await expect(groupButton).toBeVisible()
    await groupButton.click()

    const links = await page.locator('nav a[href^="/"]:visible').evaluateAll((anchors) =>
      anchors
        .map((anchor) => ({
          href: (anchor as HTMLAnchorElement).getAttribute('href'),
          name: anchor.textContent?.trim(),
        }))
        .filter((link): link is { href: string; name: string } =>
          Boolean(link.href && link.name && link.href !== '/dashboard'),
        ),
    )

    expect(links.length, `No enabled links found in ${groupName}`).toBeGreaterThan(0)

    for (const link of links) {
      await page.goto(link.href)
      await expect(page).toHaveURL(new RegExp(`${link.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`))
      await expect(page.locator('main')).toBeVisible()
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    }
  })
}