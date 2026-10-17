/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** set to '1' at build time to keep the debug hooks (window.zbbq) in a production build */
  readonly VITE_DEBUG?: string;
}
