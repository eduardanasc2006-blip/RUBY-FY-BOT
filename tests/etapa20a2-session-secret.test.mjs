/**
 * Testes da correção de segurança — SESSION_SECRET obrigatório
 *
 * BLOCO 1 — SESSION_SECRET (4 testes)
 *
 * Garante que:
 * - SESSION_SECRET configurado funciona
 * - SESSION_SECRET ausente lança erro
 * - SESSION_SECRET vazio lança erro
 * - Nenhum fallback inseguro é utilizado
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const RUN_ID = Math.random().toString(36).slice(2, 10);

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 1 — SESSION_SECRET obrigatório
// ─────────────────────────────────────────────────────────────────────────────

describe(`BLOCO 1 — SESSION_SECRET obrigatório [${RUN_ID}]`, async () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restaura todas as variáveis de ambiente
    Object.keys(process.env).forEach(key => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  test('1.1 — SESSION_SECRET configurado é aceito', async () => {
    // Configura variáveis mínimas
    process.env.SESSION_SECRET = 'test-secret-12345';

    // Importa a função getSessionSecret
    const { getSessionSecret } = await import('../src/config/web.mjs');

    const secret = getSessionSecret();
    assert.equal(secret, 'test-secret-12345', 'getSessionSecret() deve retornar o valor configurado');
  });

  test('1.2 — SESSION_SECRET ausente lança erro', async () => {
    // Remove SESSION_SECRET
    delete process.env.SESSION_SECRET;

    // Importa a função getSessionSecret
    const { getSessionSecret } = await import('../src/config/web.mjs');

    let errorThrown = null;

    try {
      getSessionSecret();
    } catch (err) {
      errorThrown = err;
    }

    assert.ok(errorThrown, 'Deve lançar erro quando SESSION_SECRET está ausente');
    assert.ok(
      errorThrown.message.includes('SESSION_SECRET'),
      'Erro deve mencionar SESSION_SECRET'
    );
    assert.ok(
      errorThrown.message.includes('.env'),
      'Erro deve mencionar arquivo .env'
    );
  });

  test('1.3 — SESSION_SECRET vazio lança erro', async () => {
    // Configura SESSION_SECRET vazio
    process.env.SESSION_SECRET = '';

    // Importa a função getSessionSecret
    const { getSessionSecret } = await import('../src/config/web.mjs');

    let errorThrown = null;

    try {
      getSessionSecret();
    } catch (err) {
      errorThrown = err;
    }

    assert.ok(errorThrown, 'Deve lançar erro quando SESSION_SECRET está vazio');
    assert.ok(
      errorThrown.message.includes('SESSION_SECRET'),
      'Erro deve mencionar SESSION_SECRET'
    );
  });

  test('1.4 — SESSION_SECRET com espaços em branco lança erro', async () => {
    // Configura SESSION_SECRET com apenas espaços
    process.env.SESSION_SECRET = '   ';

    // Importa a função getSessionSecret
    const { getSessionSecret } = await import('../src/config/web.mjs');

    let errorThrown = null;

    try {
      getSessionSecret();
    } catch (err) {
      errorThrown = err;
    }

    assert.ok(errorThrown, 'Deve lançar erro quando SESSION_SECRET contém apenas espaços');
    assert.ok(
      errorThrown.message.includes('SESSION_SECRET'),
      'Erro deve mencionar SESSION_SECRET'
    );
  });
});
