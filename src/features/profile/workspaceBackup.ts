import { z } from 'zod'
import type { AppState } from '../../domain/model'
import { appStateSchema } from '../../domain/schema'
import type { StoredAchievementImage } from '../../platform/storage/achievementImageRepository'
import type { StoredCvFile } from '../../platform/storage/cvAttachmentRepository'

const BACKUP_KIND = 'untitled-workspace-backup'
const BACKUP_VERSION = 1
export const MAX_BACKUP_FILE_SIZE = 300_000_000

const encodedFileSchema = z.object({
  id: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(200),
  size: z.number().int().min(1).max(20_000_000),
  storedAt: z.string(),
  dataBase64: z.string().min(1).max(27_000_000),
}).strict()

const encodedImageSchema = z.object({
  id: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']),
  size: z.number().int().min(1).max(10_000_000),
  storedAt: z.string(),
  dataBase64: z.string().min(1).max(13_500_000),
}).strict()

const backupSchema = z.object({
  kind: z.literal(BACKUP_KIND),
  backupVersion: z.literal(BACKUP_VERSION),
  createdAt: z.string(),
  state: z.unknown(),
  attachments: z.array(encodedFileSchema).max(500),
  achievementImages: z.array(encodedImageSchema).max(1000).default([]),
}).strict()

export type BackupParseResult =
  | { status: 'valid'; state: AppState; files: StoredCvFile[]; images: StoredAchievementImage[]; legacy: boolean }
  | { status: 'invalid'; reason: string }

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 32_768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768))
  return btoa(binary)
}

function base64ToBytes(value: string, label: string) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) throw new Error(`${label} is not valid base64 data.`)
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

export async function createWorkspaceBackup(state: AppState, storedFiles: StoredCvFile[], storedImages: StoredAchievementImage[] = []): Promise<string> {
  const validated = appStateSchema.safeParse(state)
  if (!validated.success) throw new Error('The current workspace is invalid and cannot be backed up.')
  const storedFilesById = new Map(storedFiles.map((file) => [file.id, file]))
  const attachments = []
  for (const cv of state.cvs) {
    if (!cv.attachment) continue
    const stored = storedFilesById.get(cv.attachment.id)
    if (!stored) throw new Error(`${cv.attachment.fileName} is missing from local file storage. Attach it again before creating a complete backup.`)
    if (stored.blob.size !== stored.size || stored.size !== cv.attachment.size || stored.fileName !== cv.attachment.fileName || stored.mimeType !== cv.attachment.mimeType || stored.storedAt !== cv.attachment.storedAt) throw new Error(`${cv.attachment.fileName} does not match its saved metadata. Attach it again before backing up.`)
    attachments.push({ id: stored.id, fileName: stored.fileName, mimeType: stored.mimeType, size: stored.size, storedAt: stored.storedAt, dataBase64: bytesToBase64(new Uint8Array(await stored.blob.arrayBuffer())) })
  }

  const storedImagesById = new Map(storedImages.map((image) => [image.id, image]))
  const achievementImages = []
  for (const achievement of state.achievements) {
    if (!achievement.image) continue
    const stored = storedImagesById.get(achievement.image.id)
    if (!stored) throw new Error(`${achievement.image.fileName} is missing from local image storage. Add it again before creating a complete backup.`)
    if (stored.blob.size !== stored.size || stored.size !== achievement.image.size || stored.fileName !== achievement.image.fileName || stored.mimeType !== achievement.image.mimeType || stored.storedAt !== achievement.image.storedAt) throw new Error(`${achievement.image.fileName} does not match its saved metadata. Add it again before backing up.`)
    achievementImages.push({ id: stored.id, fileName: stored.fileName, mimeType: stored.mimeType, size: stored.size, storedAt: stored.storedAt, dataBase64: bytesToBase64(new Uint8Array(await stored.blob.arrayBuffer())) })
  }

  return JSON.stringify({ kind: BACKUP_KIND, backupVersion: BACKUP_VERSION, createdAt: new Date().toISOString(), state: validated.data, attachments, achievementImages })
}

export function parseWorkspaceBackup(raw: string): BackupParseResult {
  if (!raw.trim()) return { status: 'invalid', reason: 'The backup file is empty.' }
  if (raw.length > MAX_BACKUP_FILE_SIZE) return { status: 'invalid', reason: 'The backup is larger than 300 MB and cannot be restored in the browser.' }
  try {
    const json: unknown = JSON.parse(raw)
    if (!json || typeof json !== 'object' || !('kind' in json)) {
      const legacyState = appStateSchema.safeParse(json)
      if (!legacyState.success) return { status: 'invalid', reason: 'This is not a valid Untitled workspace or backup.' }
      if (legacyState.data.cvs.some((cv) => cv.attachment) || legacyState.data.achievements.some((achievement) => achievement.image)) return { status: 'invalid', reason: 'This older workspace references local files that are not contained in the export.' }
      return { status: 'valid', state: legacyState.data as AppState, files: [], images: [], legacy: true }
    }

    const envelope = backupSchema.safeParse(json)
    if (!envelope.success) return { status: 'invalid', reason: envelope.error.issues[0]?.message ?? 'The backup format is invalid.' }
    const state = appStateSchema.safeParse(envelope.data.state)
    if (!state.success) return { status: 'invalid', reason: 'The workspace inside this backup is invalid.' }

    const expectedFiles = new Map(state.data.cvs.flatMap((cv) => cv.attachment ? [[cv.attachment.id, cv.attachment] as const] : []))
    const seenFiles = new Set<string>()
    const files: StoredCvFile[] = []
    for (const encoded of envelope.data.attachments) {
      if (seenFiles.has(encoded.id)) return { status: 'invalid', reason: 'The backup contains the same CV attachment more than once.' }
      seenFiles.add(encoded.id)
      const metadata = expectedFiles.get(encoded.id)
      if (!metadata) return { status: 'invalid', reason: `The backup contains an unreferenced CV file: ${encoded.fileName}.` }
      if (metadata.fileName !== encoded.fileName || metadata.size !== encoded.size || metadata.mimeType !== encoded.mimeType || metadata.storedAt !== encoded.storedAt) return { status: 'invalid', reason: `The CV file metadata does not match for ${encoded.fileName}.` }
      const bytes = base64ToBytes(encoded.dataBase64, 'A CV attachment')
      if (bytes.byteLength !== encoded.size) return { status: 'invalid', reason: `The CV file data is incomplete for ${encoded.fileName}.` }
      files.push({ id: encoded.id, fileName: encoded.fileName, mimeType: encoded.mimeType, size: encoded.size, storedAt: encoded.storedAt, blob: new Blob([bytes], { type: encoded.mimeType }) })
    }
    for (const [id, metadata] of expectedFiles) if (!seenFiles.has(id)) return { status: 'invalid', reason: `The backup is missing the CV file ${metadata.fileName}.` }

    const expectedImages = new Map(state.data.achievements.flatMap((achievement) => achievement.image ? [[achievement.image.id, achievement.image] as const] : []))
    const seenImages = new Set<string>()
    const images: StoredAchievementImage[] = []
    for (const encoded of envelope.data.achievementImages) {
      if (seenImages.has(encoded.id)) return { status: 'invalid', reason: 'The backup contains the same achievement image more than once.' }
      seenImages.add(encoded.id)
      const metadata = expectedImages.get(encoded.id)
      if (!metadata) return { status: 'invalid', reason: `The backup contains an unreferenced achievement image: ${encoded.fileName}.` }
      if (metadata.fileName !== encoded.fileName || metadata.size !== encoded.size || metadata.mimeType !== encoded.mimeType || metadata.storedAt !== encoded.storedAt) return { status: 'invalid', reason: `The achievement image metadata does not match for ${encoded.fileName}.` }
      const bytes = base64ToBytes(encoded.dataBase64, 'An achievement image')
      if (bytes.byteLength !== encoded.size) return { status: 'invalid', reason: `The achievement image data is incomplete for ${encoded.fileName}.` }
      images.push({ id: encoded.id, fileName: encoded.fileName, mimeType: encoded.mimeType, size: encoded.size, storedAt: encoded.storedAt, blob: new Blob([bytes], { type: encoded.mimeType }) })
    }
    for (const [id, metadata] of expectedImages) if (!seenImages.has(id)) return { status: 'invalid', reason: `The backup is missing the achievement image ${metadata.fileName}.` }
    return { status: 'valid', state: state.data as AppState, files, images, legacy: false }
  } catch (error) {
    return { status: 'invalid', reason: error instanceof Error ? error.message : 'The backup is not valid JSON.' }
  }
}
