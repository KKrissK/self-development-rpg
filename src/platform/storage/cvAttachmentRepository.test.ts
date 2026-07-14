import { describe, expect, it } from 'vitest'
import { validateCvFile } from './cvAttachmentRepository'

describe('CV attachment validation', () => {
  it('accepts common CV document formats', () => {
    for (const name of ['cv.pdf', 'cv.doc', 'cv.docx', 'cv.odt', 'cv.rtf', 'cv.txt']) {
      expect(validateCvFile(new File(['resume'], name))).toBeNull()
    }
  })

  it('rejects unsupported, empty, and oversized files', () => {
    expect(validateCvFile(new File(['image'], 'cv.png'))).toContain('PDF')
    expect(validateCvFile(new File([], 'cv.pdf'))).toContain('empty')
    const oversized = new File(['x'], 'cv.pdf')
    Object.defineProperty(oversized, 'size', { value: 20_000_001 })
    expect(validateCvFile(oversized)).toContain('20 MB')
  })
})
