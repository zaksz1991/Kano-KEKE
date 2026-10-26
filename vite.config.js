import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'public',
  server: {
    port: 5173,
    open: false
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 0, // keep large GLBs as separate files
    chunkSizeWarningLimit: 2000
  },
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.mp3']
});
