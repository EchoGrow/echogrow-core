/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the NestJS API. Defaults to `/api`, which the Vite proxy forwards. */
  readonly VITE_API_URL?: string
  /** When `"true"`, the upload page uses a local fake response instead of calling the API. */
  readonly VITE_USE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
