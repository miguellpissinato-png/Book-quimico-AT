/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// BASE_PATH: caminho onde o app fica publicado.
// GitHub Pages → "/Book-quimico-AT/" (definido no workflow). Netlify/Vercel → "/".
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // "prompt": nunca recarrega a página sozinho no meio de uma emergência.
      // O app mostra um aviso "Nova versão disponível" e a pessoa decide.
      registerType: 'prompt',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Book Químico — Elsys',
        short_name: 'Book Químico',
        description:
          'Fichas de segurança (FDS) dos produtos químicos da Assistência Técnica e Engenharia, para levar ao atendimento médico em caso de acidente.',
        lang: 'pt-BR',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#F3F5F8',
        theme_color: '#002855',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App (telas, dados das fichas, fontes, fotos) fica 100% disponível sem internet.
        globPatterns: ['**/*.{js,css,html,woff2,png,jpg,jpeg,webp,svg}'],
        navigateFallback: 'index.html',
        // Abrir/baixar um PDF é uma "navegação" do navegador: sem esta exceção o service
        // worker devolvia a tela do app no lugar do documento. PDFs e fotos seguem a regra
        // de cache própria (runtimeCaching abaixo), inclusive sem internet.
        navigateFallbackDenylist: [/\/fichas\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // PDFs das fichas: guardados no celular na primeira vez que são abertos
            // (ou todos de uma vez pelo botão "Salvar fichas para usar sem internet").
            urlPattern: ({ url }) => url.pathname.includes('/fichas/pdf/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'fichas-pdf',
              expiration: { maxEntries: 1000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
});
