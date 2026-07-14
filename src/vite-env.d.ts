/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  untitledDev?: {
    wipeAndRestart(): Promise<void>
  }
}
