import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  resolve: {
    alias: {
      '@ring-sizer/core': path.resolve(__dirname, '../../packages/core/src'),
    },
  },
  server: {
    port: 5173,
    // HTTPS not required — getUserMedia works on localhost
    open: true,
  },
});
