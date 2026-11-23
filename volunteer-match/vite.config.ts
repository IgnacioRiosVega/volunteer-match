import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig(({ mode }) => {
  const portable = mode === 'portable'

  return {
    plugins: [react(), tailwindcss(), ...(portable ? [viteSingleFile()] : [])],
    build: portable ? { outDir: 'dist-portable' } : undefined,
    test: { restoreMocks: true },
  }
})
