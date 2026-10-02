import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
    define: {
      // Prioritize the variable from loadEnv or process.env
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || ''),
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY || ''),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'es2019',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          // Long-lived vendor chunks: a feature change never re-downloads React/Firebase/etc.
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
            if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'firebase';
            if (id.includes('node_modules/@milkdown') || id.includes('node_modules/prosemirror') || id.includes('node_modules/@prosemirror') || id.includes('node_modules/remark') || id.includes('node_modules/mdast') || id.includes('node_modules/micromark') || id.includes('node_modules/unified')) return 'milkdown';
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-vendor')) return 'charts';
            if (id.includes('node_modules/@google/genai')) return 'genai';
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) return 'motion';
            return 'vendor';
          },
        },
      },
    },
    server: {
      port: 3000,
      allowedHosts: true,
    },
  };
});