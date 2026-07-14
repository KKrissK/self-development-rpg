import type { AchievementImage } from '../../domain/model'

const DATABASE_NAME = 'untitled.achievement-images.v1'
const STORE_NAME = 'achievement-images'
const DATABASE_VERSION = 1
const MAX_FILE_SIZE = 10_000_000
const MIME_BY_EXTENSION: Record<string, AchievementImage['mimeType']> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' }

export const ACHIEVEMENT_IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.avif'

export interface StoredAchievementImage extends AchievementImage { blob: Blob }

export interface AchievementImageRepository {
  save(id: string, file: File): Promise<AchievementImage>
  get(id: string): Promise<StoredAchievementImage | null>
  list(): Promise<StoredAchievementImage[]>
  replaceAll(files: StoredAchievementImage[]): Promise<void>
  delete(id: string): Promise<void>
  clear(): Promise<void>
}

const mimeTypeFor = (file: File) => MIME_BY_EXTENSION[file.name.split('.').pop()?.toLowerCase() ?? '']

export function validateAchievementImage(file: File): string | null {
  const mimeType = mimeTypeFor(file)
  if (!mimeType || file.type && file.type !== mimeType) return 'Use a JPG, PNG, WebP, GIF, or AVIF image.'
  if (file.size === 0) return 'That image is empty.'
  if (file.size > MAX_FILE_SIZE) return 'Achievement images must be smaller than 10 MB.'
  return null
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () => reject(request.error ?? new Error('The browser could not access achievement image storage.')))
  })
}

function transactionComplete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve())
    transaction.addEventListener('abort', () => reject(transaction.error ?? new Error('The image storage operation was cancelled.')))
    transaction.addEventListener('error', () => reject(transaction.error ?? new Error('The browser could not update achievement image storage.')))
  })
}

async function openDatabase() {
  if (!globalThis.indexedDB) throw new Error('This browser does not support local achievement image storage.')
  const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
  request.addEventListener('upgradeneeded', () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
  })
  return requestResult(request)
}

export function createAchievementImageRepository(): AchievementImageRepository {
  return {
    async save(id, file) {
      const validationError = validateAchievementImage(file)
      if (validationError) throw new Error(validationError)
      const mimeType = mimeTypeFor(file)!
      const record: StoredAchievementImage = { id, fileName: file.name, mimeType, size: file.size, storedAt: new Date().toISOString(), blob: file }
      const database = await openDatabase()
      try {
        const transaction = database.transaction(STORE_NAME, 'readwrite')
        const completed = transactionComplete(transaction)
        transaction.objectStore(STORE_NAME).put(record)
        await completed
      } finally { database.close() }
      const { blob: _, ...metadata } = record
      return metadata
    },
    async get(id) {
      const database = await openDatabase()
      try {
        const transaction = database.transaction(STORE_NAME, 'readonly')
        const completed = transactionComplete(transaction)
        const record = await requestResult(transaction.objectStore(STORE_NAME).get(id)) as StoredAchievementImage | undefined
        await completed
        return record ?? null
      } finally { database.close() }
    },
    async list() {
      const database = await openDatabase()
      try {
        const transaction = database.transaction(STORE_NAME, 'readonly')
        const completed = transactionComplete(transaction)
        const records = await requestResult(transaction.objectStore(STORE_NAME).getAll()) as StoredAchievementImage[]
        await completed
        return records
      } finally { database.close() }
    },
    async replaceAll(files) {
      const ids = new Set<string>()
      for (const file of files) {
        if (ids.has(file.id)) throw new Error('The backup contains duplicate achievement image IDs.')
        ids.add(file.id)
        if (file.blob.size !== file.size || file.size <= 0 || file.size > MAX_FILE_SIZE || !Object.values(MIME_BY_EXTENSION).includes(file.mimeType)) throw new Error(`The achievement image ${file.fileName} has invalid metadata.`)
      }
      const database = await openDatabase()
      try {
        const transaction = database.transaction(STORE_NAME, 'readwrite')
        const completed = transactionComplete(transaction)
        const store = transaction.objectStore(STORE_NAME)
        store.clear()
        for (const file of files) store.put(file)
        await completed
      } finally { database.close() }
    },
    async delete(id) {
      const database = await openDatabase()
      try {
        const transaction = database.transaction(STORE_NAME, 'readwrite')
        const completed = transactionComplete(transaction)
        transaction.objectStore(STORE_NAME).delete(id)
        await completed
      } finally { database.close() }
    },
    async clear() {
      if (!globalThis.indexedDB) return
      const database = await openDatabase()
      try {
        const transaction = database.transaction(STORE_NAME, 'readwrite')
        const completed = transactionComplete(transaction)
        transaction.objectStore(STORE_NAME).clear()
        await completed
      } finally { database.close() }
    },
  }
}

export const achievementImageDatabaseName = DATABASE_NAME
