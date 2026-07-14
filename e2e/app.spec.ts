import { expect, test } from '@playwright/test'

async function createCharacter(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Build your workspace' }).click()
  await page.getByLabel('Your name').fill('Kris')
  await page.getByLabel('Current role or direction').fill('Product Builder')
  await page.getByRole('button', { name: /open dashboard/i }).click()
  await expect(page.getByRole('heading', { name: /good to see you, kris/i })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(async () => {
    localStorage.clear()
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('untitled.attachments.v1')
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      request.onblocked = () => reject(new Error('CV attachment database is blocked'))
    })
  })
})

test('creates a persistent character and cannot farm XP by reopening a Goal', async ({ page }) => {
  await createCharacter(page)
  await page.getByRole('button', { name: 'Goals', exact: true }).first().click()
  await page.getByRole('button', { name: 'Create goal' }).click()
  await page.getByLabel('Goal title').fill('Ship alpha')
  await page.getByRole('button', { name: 'Add goal' }).click()
  await expect(page.getByText('Ship alpha')).toBeVisible()
  await page.getByRole('button', { name: /Complete · \+15 XP/ }).click()
  await expect(page.getByText('15 XP claimed')).toBeVisible()
  await page.getByRole('button', { name: 'Reopen' }).click()
  await expect(page.getByText('XP claimed')).toBeVisible()
  await page.getByRole('button', { name: 'Complete again' }).click()
  await page.reload()
  await expect(page.getByText('15 XP across level 1')).toBeVisible()
})

test('introduces the product before setup and keeps the landing page responsive', async ({ page }) => {
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 820 })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /see where you are/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /your plans make more sense/i })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }

  await page.getByRole('button', { name: 'Preview dark atmosphere' }).click()
  await expect(page.locator('.studio-demo')).toHaveClass(/dark/)
  await page.getByRole('button', { name: 'Preview light atmosphere' }).click()
  await expect(page.locator('.studio-demo')).not.toHaveClass(/dark/)
  await page.getByRole('button', { name: 'Build your workspace' }).click()
  await expect(page.getByRole('heading', { name: /build your character/i })).toBeVisible()
  await page.getByRole('button', { name: /back to overview/i }).click()
  await expect(page.getByRole('heading', { name: /see where you are/i })).toBeVisible()
})

test('Dashboard links to source pages and directly manages Goals and learning', async ({ page }) => {
  await createCharacter(page)
  await expect(page.getByRole('button', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-current', 'page')

  await page.getByLabel('Quick add goal').fill('Dashboard quest')
  await page.getByRole('button', { name: 'Add goal', exact: true }).click()
  await page.getByLabel('Plan for Dashboard quest').selectOption('next')
  await expect(page.getByLabel('Plan for Dashboard quest')).toHaveValue('next')
  await page.getByRole('button', { name: 'Complete Dashboard quest' }).click()
  await expect(page.getByText('Dashboard quest')).toHaveCount(0)

  await page.getByRole('button', { name: /Open Skills/ }).click()
  await expect(page.getByRole('heading', { name: 'Skills' })).toBeVisible()
  await page.getByRole('button', { name: 'Library', exact: true }).first().click()
  await page.getByRole('button', { name: 'Add resource' }).click()
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Dashboard learning item')
  await page.getByRole('button', { name: 'Add to Library' }).click()
  await page.getByRole('button', { name: 'Dashboard', exact: true }).first().click()
  await page.getByLabel('Learning status for Dashboard learning item').selectOption('completed')
  await expect(page.getByText('Dashboard learning item')).toHaveCount(0)

  await page.getByRole('button', { name: /Open Career/ }).click()
  await expect(page.getByRole('heading', { name: 'Career' })).toBeVisible()
})

test('a Goal pulls Library support and Library reflects Goal completion', async ({ page }) => {
  await createCharacter(page)
  await page.getByRole('button', { name: 'Library', exact: true }).first().click()
  await page.getByRole('button', { name: 'Add resource' }).click()
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Architecture field guide')
  await page.getByRole('button', { name: 'Add to Library' }).click()

  await page.getByRole('button', { name: 'Goals', exact: true }).first().click()
  await page.getByRole('button', { name: 'Create goal' }).click()
  await page.getByLabel('Goal title').fill('Design the new system')
  await page.getByLabel(/Architecture field guide/).check()
  await page.getByRole('button', { name: 'Add goal' }).click()
  const goalCard = page.getByRole('heading', { name: 'Design the new system' }).locator('xpath=ancestor::article')
  await expect(goalCard.getByText('Architecture field guide')).toBeVisible()
  await goalCard.getByRole('button', { name: /Complete · \+15 XP/ }).click()

  await page.getByRole('button', { name: 'Library', exact: true }).first().click()
  const resourceCard = page.getByRole('heading', { name: 'Architecture field guide' }).locator('xpath=ancestor::article')
  await expect(resourceCard.getByText('Goal completed')).toBeVisible()
  await expect(resourceCard.locator('.goal-impact small')).toHaveText('Design the new system')
  await expect(resourceCard.getByLabel('Architecture field guide status')).toHaveValue('queued')

  await page.getByRole('button', { name: 'Goals', exact: true }).first().click()
  await page.getByRole('button', { name: 'Reopen' }).click()
  await page.getByRole('button', { name: 'Library', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Architecture field guide' }).locator('xpath=ancestor::article').getByText('Goal completed')).toHaveCount(0)
})

test('keeps the completed Goal history bounded until the user loads more', async ({ page }) => {
  await createCharacter(page)
  await page.evaluate(() => {
    const key = 'untitled.workspace.v1'
    const state = JSON.parse(localStorage.getItem(key)!)
    state.quests = Array.from({ length: 10 }, (_, index) => ({
      id: `done-${index}`,
      profileId: state.activeProfileId,
      title: `Completed quest ${index + 1}`,
      notes: '',
      priority: 'medium',
      status: 'done',
      xp: 10,
      completedAt: new Date(Date.UTC(2026, 6, 14, 12, index)).toISOString(),
      xpAwardedAt: new Date(Date.UTC(2026, 6, 14, 12, index)).toISOString(),
    }))
    localStorage.setItem(key, JSON.stringify(state))
  })
  await page.reload()
  await page.getByRole('button', { name: 'Goals', exact: true }).first().click()
  await expect(page.locator('.history-row')).toHaveCount(8)
  await page.getByRole('button', { name: /Load 8 more/ }).click()
  await expect(page.locator('.history-row')).toHaveCount(10)
})

test('adds a skill, learning resource, income source, and CV variant', async ({ page }) => {
  await createCharacter(page)
  await page.getByRole('button', { name: 'Skills', exact: true }).first().click()
  await page.getByRole('button', { name: 'Add skill' }).click()
  await expect(page.getByRole('tab', { name: /AI assessment/ })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('tab', { name: /Manual/ }).click()
  await page.getByLabel('Skill name').fill('TypeScript')
  await page.getByLabel('Category').fill('Technical')
  await page.getByLabel('Include structured skill profile').check()
  await page.getByLabel('Assessment summary').fill('Reliable on routine typed frontend work with room to grow in advanced type design.')
  await page.getByLabel('Demonstrated strengths').fill('Builds typed React features independently\nDiagnoses common compiler errors')
  await page.getByLabel('Growth areas').fill('Advanced generics and library API design')
  await page.getByRole('button', { name: 'Save skill' }).click()
  await expect(page.getByRole('heading', { name: 'TypeScript' })).toBeVisible()
  await expect(page.getByText(/Reliable on routine typed frontend work/)).toBeVisible()
  await page.getByText('View skill profile').click()
  await expect(page.getByText('Builds typed React features independently')).toBeVisible()
  await expect(page.getByText('Advanced generics and library API design')).toBeVisible()
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.getByLabel('Skill name').fill('Advanced TypeScript')
  await page.getByLabel('Current level (1–10)').fill('6')
  await page.getByLabel('Experience').fill('Built and shipped a typed React application.')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('heading', { name: 'Advanced TypeScript' })).toBeVisible()

  await page.getByRole('button', { name: 'Library', exact: true }).first().click()
  await page.getByRole('button', { name: 'Add resource' }).click()
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Effective TypeScript')
  await page.getByRole('button', { name: 'Add to Library' }).click()
  await expect(page.getByRole('heading', { name: 'Effective TypeScript' })).toBeVisible()

  await page.getByRole('button', { name: 'Career', exact: true }).first().click()
  await page.getByLabel('Monthly income target').fill('750000')
  await page.getByLabel('Income source name').click()
  await expect(page.getByLabel('Monthly income target')).toHaveValue('750,000')
  await page.getByLabel('Income source name').fill('Salary')
  await page.getByLabel('Monthly amount').fill('500000')
  await expect(page.getByLabel('Monthly amount')).toHaveValue('500,000')
  await page.getByRole('button', { name: 'Add income source' }).click()
  await expect(page.locator('.income-row strong')).toContainText(/500[,.\s]000/)
  await page.getByRole('button', { name: 'CV vault' }).click()
  await page.getByLabel('CV name').fill('Frontend CV — EN')
  await page.getByLabel('Language').selectOption('English')
  await page.getByRole('button', { name: 'Add to vault' }).click()
  await expect(page.getByRole('heading', { name: 'Frontend CV — EN' })).toBeVisible()
})

test('stores, reloads, downloads, and wipes an actual CV file', async ({ page }) => {
  await createCharacter(page)
  await page.getByRole('button', { name: 'Career', exact: true }).first().click()
  await page.getByRole('button', { name: 'CV vault' }).click()
  await page.getByLabel('CV name').fill('Local PDF CV')
  await page.getByLabel(/CV file/).setInputFiles({ name: 'kris-cv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 local CV') })
  await page.getByRole('button', { name: 'Add to vault' }).click()
  await expect(page.getByText('kris-cv.pdf', { exact: true })).toBeVisible()
  await expect(page.getByText(/stored on this device/i)).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Career', exact: true }).first().click()
  await page.getByRole('button', { name: 'CV vault' }).click()
  await expect(page.getByText('kris-cv.pdf', { exact: true })).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('kris-cv.pdf')

  await page.getByRole('button', { name: 'Profile', exact: true }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Reset workspace' }).click()
  await expect(page.getByRole('heading', { name: /see where you are/i })).toBeVisible()
  const storedFiles = await page.evaluate(() => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open('untitled.attachments.v1', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const transaction = request.result.transaction('cv-files', 'readonly')
      const count = transaction.objectStore('cv-files').count()
      count.onsuccess = () => resolve(count.result)
      count.onerror = () => reject(count.error)
    }
  }))
  expect(storedFiles).toBe(0)
})

test('validates and imports a portable AI response as a Goal', async ({ page }) => {
  await createCharacter(page)
  await page.getByRole('button', { name: 'AI Coach', exact: true }).first().click()
  const response = JSON.stringify({ schemaVersion: 1, summary: 'Build evidence.', recommendations: [{ title: 'Publish a case study', rationale: 'Shows capability', nextStep: 'Draft the outline', impact: 'high', kind: 'goal', xp: 20 }] })
  await page.locator('textarea').nth(1).fill(response)
  await page.getByRole('button', { name: 'Validate response' }).click()
  await expect(page.getByRole('heading', { name: 'Build evidence.' })).toBeVisible()
  await page.getByRole('button', { name: 'Import 1 items' }).click()
  await page.getByRole('button', { name: 'Goals', exact: true }).first().click()
  await expect(page.getByText('Publish a case study')).toBeVisible()
})

test('Skills embeds AI generation and progress-tracked assessment', async ({ page }) => {
  await createCharacter(page)
  await page.getByRole('button', { name: 'Skills', exact: true }).first().click()
  await page.getByRole('button', { name: 'Add skill' }).click()
  await page.getByRole('tab', { name: /AI generate/ }).click()
  await page.getByLabel('What skills should the AI create?').fill('Add TypeScript based on my small React projects.')
  await page.getByRole('button', { name: 'Generate copy-paste prompt' }).click()
  await expect(page.getByLabel('Generated AI prompt')).toContainText('Return JSON only')

  const generated = JSON.stringify({ schemaVersion: 1, skills: [{ name: 'TypeScript', category: 'Technical', level: 3, targetLevel: 7, status: 'learning', evidence: 'Built small React projects.' }] })
  await page.getByLabel('AI response JSON').fill(generated)
  await page.getByRole('button', { name: 'Validate & preview' }).click()
  await expect(page.getByRole('heading', { name: '1 skills ready' })).toBeVisible()
  await page.getByRole('button', { name: 'Import 1 items' }).click()

  await page.getByRole('tab', { name: /AI assessment/ }).click()
  await page.getByLabel('Skill and context').fill('Assess my SQL skill.')
  await page.getByRole('button', { name: 'Generate copy-paste prompt' }).click()
  await expect(page.getByLabel('Generated AI prompt')).toContainText('Question 2 of 6')
  const assessed = JSON.stringify({ schemaVersion: 1, skill: { name: 'SQL', category: 'Data', level: 2, targetLevel: 6, status: 'learning', evidence: `Can write basic SELECT queries. ${'E'.repeat(700)}`, assessmentSummary: `Basic familiarity; joins and query planning are gaps. ${'S'.repeat(700)}`, strengths: ['Writes basic SELECT queries independently'], gaps: ['Needs practice with joins and query planning'] } })
  await page.getByLabel('AI response JSON').fill(assessed)
  await page.getByRole('button', { name: 'Validate & preview' }).click()
  await expect(page.getByRole('heading', { name: 'SQL: level 2/10' })).toBeVisible()
  await page.getByRole('button', { name: 'Import assessed skill' }).click()
  await expect(page.getByRole('status')).toContainText('Imported assessed skill')

  await expect(page.getByRole('heading', { name: 'TypeScript' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'SQL' })).toBeVisible()
  const sqlCard = page.getByRole('heading', { name: 'SQL' }).locator('xpath=ancestor::article')
  await expect(sqlCard.getByText('Assessment summary')).toBeVisible()
  await expect(sqlCard.getByText(/confidence/i)).toHaveCount(0)
  await sqlCard.getByText('View skill profile').click()
  await expect(sqlCard.getByRole('button', { name: 'Read full experience' })).toBeVisible()
  await sqlCard.getByRole('button', { name: 'Read full experience' }).click()
  await expect(sqlCard.getByRole('button', { name: 'Show less' })).toBeVisible()
  await expect(sqlCard.getByText('Writes basic SELECT queries independently')).toBeVisible()
  await expect(sqlCard.getByText('Needs practice with joins and query planning')).toBeVisible()
  await expect(page.getByRole('button', { name: 'AI Profiler' })).toHaveCount(0)
})

test('Goals and Library embed their own portable AI generators', async ({ page }) => {
  await createCharacter(page)
  await page.getByRole('button', { name: 'Goals', exact: true }).first().click()
  await page.getByRole('button', { name: 'Create goal' }).click()
  await page.getByRole('tab', { name: /AI generate/ }).click()
  await page.getByLabel('What goals should the AI create?').fill('Turn a portfolio launch into two concrete outcomes.')
  await page.getByRole('button', { name: 'Generate copy-paste prompt' }).click()
  await page.getByLabel('AI response JSON').fill(JSON.stringify({ schemaVersion: 1, quests: [{ title: 'Draft portfolio outline', notes: 'Define the sections.', priority: 'high', status: 'now', xp: 15 }] }))
  await page.getByRole('button', { name: 'Validate & preview' }).click()
  await page.getByRole('button', { name: 'Import 1 items' }).click()
  await expect(page.getByRole('heading', { name: 'Draft portfolio outline' })).toBeVisible()

  await page.getByRole('button', { name: 'Library', exact: true }).first().click()
  await page.getByRole('button', { name: 'Add resource' }).click()
  await page.getByRole('tab', { name: /AI generate/ }).click()
  await page.getByLabel('What library items should the AI create?').fill('Add one TypeScript book for intermediate learners.')
  await page.getByRole('button', { name: 'Generate copy-paste prompt' }).click()
  await page.getByLabel('AI response JSON').fill(JSON.stringify({ schemaVersion: 1, resources: [{ title: 'Effective TypeScript', kind: 'book', status: 'queued', creator: 'Dan Vanderkam', url: '', notes: 'Focus on type design.' }] }))
  await page.getByRole('button', { name: 'Validate & preview' }).click()
  await page.getByRole('button', { name: 'Import 1 items' }).click()
  await expect(page.getByRole('heading', { name: 'Effective TypeScript' })).toBeVisible()
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
