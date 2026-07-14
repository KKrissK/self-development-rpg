/**
 * Extracts the largest complete JSON object from pasted text.
 * This ignores prose and Markdown fences around an AI response while preserving
 * braces that appear inside quoted JSON strings.
 */
export function extractJsonObject(raw: string): string {
  const candidates: string[] = []

  for (let start = 0; start < raw.length; start += 1) {
    if (raw[start] !== '{') continue
    let depth = 0
    let inString = false
    let escaped = false

    for (let index = start; index < raw.length; index += 1) {
      const character = raw[index]
      if (inString) {
        if (escaped) escaped = false
        else if (character === '\\') escaped = true
        else if (character === '"') inString = false
        continue
      }
      if (character === '"') { inString = true; continue }
      if (character === '{') depth += 1
      if (character !== '}') continue
      depth -= 1
      if (depth !== 0) continue

      const candidate = raw.slice(start, index + 1)
      try {
        const value: unknown = JSON.parse(candidate)
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) candidates.push(candidate)
      } catch {
        // Keep scanning: an AI may place a malformed example before the real object.
      }
      break
    }
  }

  return candidates.sort((left, right) => right.length - left.length)[0] ?? raw.trim()
}
