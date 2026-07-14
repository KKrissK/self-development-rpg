import type { CvAttachment } from '../../domain/model'

const DATABASE_NAME = 'untitled.attachments.v1'
const STORE_NAME = 'cv-files'
const DATABASE_VERSION = 1
const MAX_FILE_SIZE = 20_000_000
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt'])

export const CV_FILE_ACCEPT = '.pdf,.doc,.docx,.odt,.rtf,.txt'

export interface StoredCvFile extends CvAttachment {
  blob: Blob
}

export interface CvAttachmentRepository {
  save(id: string, file: File): Promise<CvAttachment>
  get(id: string): Promise<StoredCvFile | null>
  list(): Promise<StoredCvFile[]>
  replaceAll(files: StoredCvFile[]): Promise<void>
  delete(id: string): Promise<void>
  clear(): Promise<void>
}

export function validateCvFile(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.has(extension)) return 'Use a PDF, DOC, DOCX, ODT, RTF, or TXT file.'
  if (file.size === 0) return 'That file is empty.'
  if (file.size > MAX_FILE_SIZE) return 'CV files must be smaller than 20 MB.'
  return null
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () => reject(request.error ?? new Error('The browser could not access CV storage.')))
  })
}

function transactionComplete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve())
    transaction.addEventListener('abort', () => reject(transaction.error ?? new Error('The CV storage operation was cancelled.')))
    transaction.addEventListener('error', () => reject(transaction.error ?? new Error('The browser could not update CV storage.')))
  })
}

function openDatabase() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('This browser does not support local CV file storage.'))
  const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
  request.addEventListener('upgradeneeded', () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
  })
  return requestResult(request)
}

export function createCvAttachmentRepository(): CvAttachmentRepository {
  return {
    async save(id, file) {
      const validationError = validateCvFile(file)
      if (validationError) throw new Error(validationError)
      const storedAt = new Date().toISOString()
      const record: StoredCvFile = { id, fileName: file.name, mimeType: file.type || 'application/octet-stream', size: file.size, storedAt, blob: file }
      const database = await openDatabase()
      try {
        const transaction = database.transaction(STORE_NAME, 'readwrite')
        const completed = transactionComplete(transaction)
        transaction.objectStore(STORE_NAME).put(record)
        await completed
      } finally {
        database.close()
      }
      return { id, fileName: record.fileName, mimeType: record.mimeType, size: record.size, storedAt }
    },
    async get(id) {
      const database = await openDatabase()
      try {
        const transaction = database.transaction(STORE_NAME, 'readonly')
        const completed = transactionComplete(transaction)
        const record = await requestResult(transaction.objectStore(STORE_NAME).get(id)) as StoredCvFile | undefined
        await completed
        return record ?? null
      } finally {
        database.close()
      }
    },
    async list() {
      const database = await openDatabase()
      try {
        const transaction = database.transaction(STORE_NAME, 'readonly')
        const completed = transactionComplete(transaction)
        const records = await requestResult(transaction.objectStore(STORE_NAME).getAll()) as StoredCvFile[]
        await completed
        return records
      } finally {
        database.close()
      }
    },
    async replaceAll(files) {
      const ids = new Set<string>()
      for (const file of files) {
        if (ids.has(file.id)) throw new Error('The backup contains duplicate CV file IDs.')
        ids.add(file.id)
        if (file.blob.size !== file.size || file.size <= 0 || file.size > MAX_FILE_SIZE) throw new Error(`The stored CV file ${file.fileName} has invalid size metadata.`)
      }
      const database = await openDatabase()
      try {
        const transaction = database.transaction(STORE_NAME, 'readwrite')
        const completed = transactionComplete(transaction)
        const store = transaction.objectStore(STORE_NAME)
        store.clear()
        for (const file of files) store.put(file)
        await completed
      } finally {
        database.close()
      }
    },
    async delete(id) {
      const database = await openDatabase()
      try {
        const transaction = database.transaction(STORE_NAME, 'readwrite')
        const completed = transactionComplete(transaction)
        transaction.objectStore(STORE_NAME).delete(id)
        await completed
      } finally {
        database.close()
      }
    },
    async clear() {
      if (!globalThis.indexedDB) return
      const database = await openDatabase()
      try {
        const transaction = database.transaction(STORE_NAME, 'readwrite')
        const completed = transactionComplete(transaction)
        transaction.objectStore(STORE_NAME).clear()
        await completed
      } finally {
        database.close()
      }
    },
  }
}

export const cvAttachmentDatabaseName = DATABASE_NAME
