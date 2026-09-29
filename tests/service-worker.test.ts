import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('service worker (vite.config.ts)', () => {
  it('não devolve a tela do app ao abrir/baixar PDFs e fotos das fichas', () => {
    // Sem esta exceção, "Abrir ficha completa (PDF)" mostrava o app em vez do documento.
    const config = fs.readFileSync('vite.config.ts', 'utf8');
    expect(config).toMatch(/navigateFallbackDenylist:\s*\[\/\\\/fichas\\\/\/\]/);
  });
});
