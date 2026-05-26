import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // sockjs-client (CommonJS) references Node's `global`; map it to the
    // standard browser equivalent so Vite's ESM build doesn't crash.
    global: 'globalThis',
  },
});
