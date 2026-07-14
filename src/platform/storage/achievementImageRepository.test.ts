import { describe, expect, it } from 'vitest'
import { validateAchievementImage } from './achievementImageRepository'

describe('achievement image validation', () => {
  it('accepts common raster image formats', () => {
    for (const [name, type] of [['project.jpg', 'image/jpeg'], ['project.png', 'image/png'], ['project.webp', 'image/webp'], ['project.gif', 'image/gif'], ['project.avif', 'image/avif']]) expect(validateAchievementImage(new File(['image'], name, { type }))).toBeNull()
  })

  it('rejects unsupported, empty, and oversized images', () => {
    expect(validateAchievementImage(new File(['svg'], 'project.svg', { type: 'image/svg+xml' }))).toContain('JPG')
    expect(validateAchievementImage(new File([], 'project.png', { type: 'image/png' }))).toContain('empty')
    const oversized = new File(['x'], 'project.jpg', { type: 'image/jpeg' })
    Object.defineProperty(oversized, 'size', { value: 10_000_001 })
    expect(validateAchievementImage(oversized)).toContain('10 MB')
  })
})
