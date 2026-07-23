import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Cloud-only (Supabase): chỉ precache app shell, KHÔNG cache API response
      // — dữ liệu học luôn phải lấy mới từ mạng, cache dữ liệu cũ sẽ gây lệch
      // giữa các máy.
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg,png}'],
        navigateFallbackDenylist: [/^\/__save-icon/],
      },
      manifest: {
        name: 'Chăm — học đều mỗi ngày',
        short_name: 'Chăm',
        description: 'App cá nhân quản lý học Lập trình, Tiếng Nhật và TOEIC.',
        theme_color: '#7c5cd6',
        background_color: '#f3effc',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
