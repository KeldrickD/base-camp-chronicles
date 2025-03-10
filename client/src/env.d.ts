/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WEB3_NETWORK: string
  readonly VITE_GAME_WIDTH: string
  readonly VITE_GAME_HEIGHT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 