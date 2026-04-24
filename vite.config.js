import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const homepage = '/Web_Bluetooth_App_WBA/';

export default defineConfig({
  base: homepage,
  plugins: [
    react(),
  ],
  test: {
    globals: true,
  },
});