import { cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const guestRoot = fileURLToPath(new URL('./guest/', import.meta.url));
const output = fileURLToPath(new URL('./dist-guest/', import.meta.url));
const sourceMedia = fileURLToPath(new URL('./public/media/', import.meta.url));
const outputMedia = fileURLToPath(new URL('./dist-guest/media/', import.meta.url));

export default defineConfig({
  root: guestRoot,
  publicDir: false,
  plugins: [
    react(),
    {
      name: 'guest-menu-media',
      apply: 'build',
      generateBundle(_options, bundle) {
        const excludedPage = /\/pages\/(DashboardPage|LoginPage|KitchenDisplayPage|WaiterPage|SuperAdminPage|MarketingLanding)\.tsx$/;
        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'chunk' && Object.keys(chunk.modules).some((id) => excludedPage.test(id))) {
            this.error('Staff or marketing page reached the guest bundle.');
          }
        }
      },
      closeBundle() {
        cpSync(sourceMedia, outputMedia, { recursive: true });
      },
    },
  ],
  build: {
    outDir: output,
    emptyOutDir: true,
    manifest: true,
  },
});
