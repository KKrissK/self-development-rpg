import { expect, test } from '@playwright/test'

async function createCharacter(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByLabel('Your name').fill('Kris')
  await page.getByLabel('Current role or direction').fill('Product Builder')
  await page.getByRole('button', { name: /enter command center/i }).click()
  await expect(page.getByRole('heading', { name: /good to see you, kris/i })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
})

test('creates a persistent character and completes a quest once', async ({ page }) => {
  await createCharacter(page)
  await page.getByRole('button', { name: 'Quests', exact: true }).first().click()
  await page.getByLabel('New quest').fill('Ship alpha')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText('Ship alpha')).toBeVisible()
  await page.getByRole('button', { name: 'Complete', exact: true }).click()
  await page.reload()
  await expect(page.getByText('Level 1 · 15 XP')).toBeVisible()
})

test('adds a skill, learning resource, income source, and CV variant', async ({ page }) => {
  await createCharacter(page)
  await page.getByRole('button', { name: 'Skills', exact: true }).first().click()
  await page.getByRole('button', { name: 'Add skill' }).click()
  await page.getByLabel('Skill name').fill('TypeScript')
  await page.getByLabel('Category').fill('Technical')
  await page.getByRole('button', { name: 'Save skill' }).click()
  await expect(page.getByRole('heading', { name: 'TypeScript' })).toBeVisible()

  await page.getByRole('button', { name: 'Library', exact: true }).first().click()
  await page.getByRole('button', { name: 'Add resource' }).click()
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Effective TypeScript')
  await page.getByRole('button', { name: 'Add to queue' }).click()
  await expect(page.getByRole('heading', { name: 'Effective TypeScript' })).toBeVisible()

  await page.getByRole('button', { name: 'Career', exact: true }).first().click()
  await page.getByLabel('Income source').fill('Salary')
  await page.getByLabel('Monthly amount').fill('500000')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.locator('.income-row strong')).toContainText(/500[,.\s]000/)
  await page.getByRole('button', { name: 'CV vault' }).click()
  await page.getByLabel('CV name').fill('Frontend CV — EN')
  await page.getByLabel('Language').selectOption('English')
  await page.getByRole('button', { name: 'Track CV' }).click()
  await expect(page.getByRole('heading', { name: 'Frontend CV — EN' })).toBeVisible()
})

test('validates and imports a portable AI response as a quest', async ({ page }) => {
  await createCharacter(page)
  await page.getByRole('button', { name: 'AI Coach', exact: true }).first().click()
  const response = JSON.stringify({ schemaVersion: 1, summary: 'Build evidence.', recommendations: [{ title: 'Publish a case study', rationale: 'Shows capability', nextStep: 'Draft the outline', impact: 'high', kind: 'quest', xp: 20 }] })
  await page.locator('textarea').nth(1).fill(response)
  await page.getByRole('button', { name: 'Validate response' }).click()
  await expect(page.getByRole('heading', { name: 'Build evidence.' })).toBeVisible()
  await page.getByRole('button', { name: 'Import 1 items' }).click()
  await page.getByRole('button', { name: 'Quests', exact: true }).first().click()
  await expect(page.getByText('Publish a case study')).toBeVisible()
})

for (const width of [320, 360, 390, 412, 768, 1024]) {
  test(`has no page overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 820 })
    await createCharacter(page)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow).toBe(false)
  })
}

test('production runtime stays same-origin and reloads offline', async ({ page, context }) => {
  const crossOrigin: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.origin !== 'http://127.0.0.1:4173') crossOrigin.push(request.url())
  })
  await createCharacter(page)
  await expect.poll(async () => page.evaluate(() => navigator.serviceWorker.ready.then(() => true))).toBe(true)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: /good to see you, kris/i })).toBeVisible()
  expect(crossOrigin).toEqual([])
})

test('mobile users can reach profile, data, and theme controls', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 820 })
  await createCharacter(page)
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await page.getByRole('button', { name: 'Profile & data' }).click()
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export JSON' })).toBeVisible()
  await expect(page.getByRole('button', { name: /mode/i })).toBeVisible()
})

test('invalid profile edits cannot make the workspace unloadable', async ({ page }) => {
  await createCharacter(page)
  await page.getByRole('button', { name: 'Profile', exact: true }).click()
  await page.getByLabel('Display name').fill('')
  await page.reload()
  await expect(page.getByRole('heading', { name: /good to see you, kris/i })).toBeVisible()
})

test('bulk JSON preview imports heterogeneous profile data without frontend repetition', async ({ page }) => {
  await createCharacter(page)
  await page.getByRole('button', { name: 'Profile', exact: true }).click()
  const payload = {
    schemaVersion: 1,
    profile: { title: 'QA / Software Developer' },
    skills: [
      { name: 'Java', category: 'Software Development', level: 6, targetLevel: 8, status: 'practicing', evidence: 'Practical experience.' },
      { name: 'Linux', category: 'Operating Systems', level: 2, targetLevel: 6, status: 'learning', evidence: 'Basic usage.' },
    ],
    quests: [{ title: 'Ship a project', priority: 'high', status: 'now', xp: 25 }],
    knowledgeNotes: [{ title: 'Triage workflow', body: 'Match known failures before root-cause analysis.', tags: ['qa'] }],
    incomeSources: [{ name: 'Salary', type: 'Employment', monthlyAmount: 400000, currency: 'HUF', active: true }],
  }
  await page.getByRole('textbox', { name: 'Bulk import JSON' }).fill(JSON.stringify(payload))
  await page.getByRole('button', { name: 'Validate & preview' }).click()
  await expect(page.getByLabel('Import preview')).toContainText('2skills')
  await page.getByRole('button', { name: 'Import selected payload' }).click()
  await expect(page.getByRole('status')).toContainText('imported')
  await page.getByRole('button', { name: 'Skills' }).click()
  await expect(page.getByRole('heading', { name: 'Java' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Linux' })).toBeVisible()
  await page.getByRole('button', { name: 'Library' }).click()
  await expect(page.getByRole('heading', { name: 'Triage workflow' })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Library', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Triage workflow' })).toBeVisible()
})
