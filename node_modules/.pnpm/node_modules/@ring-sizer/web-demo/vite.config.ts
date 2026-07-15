import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  resolve: {
    alias: {
      '@ring-sizer/web-component': path.resolve(__dirname, '../../packages/web-component/src'),
    },
  },
  server: {
    port: 5173,
    // HTTPS not required — getUserMedia works on localhost
    open: true,
  },
});
