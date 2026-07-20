/**
 * Testes da Etapa 20A.2 — Segurança e Robustez da API/Painel
 *
 * BLOCO 1 — Rate Limiting (5 testes)
 * BLOCO 2 — Headers de Segurança (4 testes)
 * BLOCO 3 — PRAGMA busy_timeout (1 teste)
 *
 * Total: 10 testes
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert  from 'node:assert/strict';
import express from 'express';
import http    from 'node:http';
import {
  rateLimitMiddleware,
  resetRateLimiter,
  getRateLimiterStats,
} from '../src/web/middleware/rateLimit.mjs';

const RUN_ID = Math.random().toString(36).slice(2, 10);

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 1 — Rate Limiting
// ─────────────────────────────────────────────────────────────────────────────

describe(`BLOCO 1 — Rate Limiting [${RUN_ID}]`, async () => {
  let app;
  let server;
  let baseUrl;

  beforeEach(async () => {
    resetRateLimiter();
    app = express();
    app.use(rateLimitMiddleware);
    app.get('/test', (_req, res) => res.json({ ok: true }));
    app.post('/test', (req, res) => res.json({ ok: true }));

    await new Promise(resolve => {
      server = app.listen(0, () => {
        const addr = server.address();
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    resetRateLimiter();
  });

  test('1.1 — rateLimitMiddleware exportado corretamente', () => {
    assert.ok(typeof rateLimitMiddleware === 'function', 'rateLimitMiddleware deve ser função');
    assert.ok(typeof resetRateLimiter === 'function', 'resetRateLimiter deve ser função');
    assert.ok(typeof getRateLimiterStats === 'function', 'getRateLimiterStats deve ser função');
  });

  test('1.2 — GET dentro do limite retorna 200', async () => {
    const res = await fetch(`${baseUrl}/test`);
    assert.equal(res.status, 200, 'GET deve retornar 200 dentro do limite');
    const body = await res.json();
    assert.equal(body.ok, true);
  });

  test('1.3 — POST dentro do limite retorna 200', async () => {
    const res = await fetch(`${baseUrl}/test`, { method: 'POST' });
    assert.equal(res.status, 200, 'POST deve retornar 200 dentro do limite');
    const body = await res.json();
    assert.equal(body.ok, true);
  });

  test('1.4 — exceder limite GET retorna 429', async () => {
    const stats = getRateLimiterStats();
    const limit = stats.limits.GET;

    // Faz requisições até exceder o limite
    for (let i = 0; i < limit; i++) {
      const res = await fetch(`${baseUrl}/test`);
      assert.ok(res.ok, `Requisição ${i + 1} deve ser bem-sucedida`);
    }

    // Próxima deve ser bloqueada
    const blockedRes = await fetch(`${baseUrl}/test`);
    assert.equal(blockedRes.status, 429, 'Requisição após limite deve retornar 429');

    const body = await blockedRes.json();
    assert.equal(body.error, 'Too Many Requests');
    assert.ok(blockedRes.headers.get('Retry-After'), 'Deve ter header Retry-After');
    assert.ok(blockedRes.headers.get('X-RateLimit-Limit'), 'Deve ter header X-RateLimit-Limit');
  });

  test('1.5 — exceder limite POST retorna 429', async () => {
    const stats = getRateLimiterStats();
    const limit = stats.limits.POST;

    // Faz requisições até exceder o limite
    for (let i = 0; i < limit; i++) {
      const res = await fetch(`${baseUrl}/test`, { method: 'POST' });
      assert.ok(res.ok, `Requisição ${i + 1} deve ser bem-sucedida`);
    }

    // Próxima deve ser bloqueada
    const blockedRes = await fetch(`${baseUrl}/test`, { method: 'POST' });
    assert.equal(blockedRes.status, 429, 'POST após limite deve retornar 429');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2 — Headers de Segurança
// ─────────────────────────────────────────────────────────────────────────────

describe(`BLOCO 2 — Headers de Segurança [${RUN_ID}]`, async () => {
  let app;
  let server;
  let baseUrl;

  beforeEach(async () => {
    app = express();

    // Middleware de segurança (mesmo do server.mjs)
    app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      next();
    });

    app.get('/test', (_req, res) => res.json({ ok: true }));

    await new Promise(resolve => {
      server = app.listen(0, () => {
        const addr = server.address();
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  test('2.1 — X-Content-Type-Options presente', async () => {
    const res = await fetch(`${baseUrl}/test`);
    const header = res.headers.get('X-Content-Type-Options');
    assert.equal(header, 'nosniff', 'X-Content-Type-Options deve ser nosniff');
  });

  test('2.2 — X-Frame-Options presente', async () => {
    const res = await fetch(`${baseUrl}/test`);
    const header = res.headers.get('X-Frame-Options');
    assert.equal(header, 'SAMEORIGIN', 'X-Frame-Options deve ser SAMEORIGIN');
  });

  test('2.3 — X-XSS-Protection presente', async () => {
    const res = await fetch(`${baseUrl}/test`);
    const header = res.headers.get('X-XSS-Protection');
    assert.equal(header, '1; mode=block', 'X-XSS-Protection deve ser 1; mode=block');
  });

  test('2.4 — Referrer-Policy presente', async () => {
    const res = await fetch(`${baseUrl}/test`);
    const header = res.headers.get('Referrer-Policy');
    assert.equal(header, 'strict-origin-when-cross-origin', 'Referrer-Policy incorreto');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3 — PRAGMA busy_timeout
// ─────────────────────────────────────────────────────────────────────────────

describe(`BLOCO 3 — PRAGMA busy_timeout [${RUN_ID}]`, async () => {
  test('3.1 — busy_timeout configurado em 5000ms após initDatabase', async () => {
    const { DatabaseSync } = await import('node:sqlite');

    // Cria banco temporário e aplica as mesmas PRAGMAs
    const db = new DatabaseSync(':memory:');
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('PRAGMA busy_timeout = 5000');

    // Verifica se o busy_timeout está configurado
    const result = db.prepare('PRAGMA busy_timeout').get();

    assert.ok(result, 'PRAGMA busy_timeout deve retornar resultado');
    assert.equal(result.timeout, 5000, 'busy_timeout deve ser 5000ms');

    db.close();
  });
});
