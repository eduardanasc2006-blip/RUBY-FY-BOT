import fs from 'node:fs';
import path from 'node:path';

const STORE_PATH = path.resolve('./data/rate-store.json');
const MAX_HISTORY = 10;
const DEFAULT_RATE = { robux: 1000, brl: 38 };

function ensureDir() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function load() {
  try {
    ensureDir();
    if (!fs.existsSync(STORE_PATH)) return { currentRate: { ...DEFAULT_RATE }, history: [] };
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[store] Falha ao carregar taxa, usando padrão:', err.message);
    return { currentRate: { ...DEFAULT_RATE }, history: [] };
  }
}

function save(data) {
  try {
    ensureDir();
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[store] Falha ao salvar taxa:', err.message);
  }
}

let _data = load();

export function getCurrentRate() {
  return { ..._data.currentRate };
}

export function getHistory() {
  return [..._data.history];
}

export function updateRate(after, changedBy) {
  const entry = {
    changedBy,
    changedAt: new Date().toISOString(),
    before: { ..._data.currentRate },
    after: { ...after },
  };
  _data.history.push(entry);
  if (_data.history.length > MAX_HISTORY) _data.history.shift();
  _data.currentRate = { ...after };
  save(_data);
}
