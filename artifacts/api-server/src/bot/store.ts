import fs from "node:fs";
import path from "node:path";
import { logger } from "../lib/logger";

export interface RateEntry {
  robux: number;
  brl: number;
}

export interface HistoryEntry {
  changedBy: string;
  changedAt: string;
  before: RateEntry;
  after: RateEntry;
}

interface StoreData {
  currentRate: RateEntry;
  history: HistoryEntry[];
}

const STORE_PATH = path.resolve("./data/rate-store.json");
const MAX_HISTORY = 10;
const DEFAULT_RATE: RateEntry = { robux: 1000, brl: 38 };

function ensureDir(): void {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function load(): StoreData {
  try {
    ensureDir();
    if (!fs.existsSync(STORE_PATH)) {
      return { currentRate: { ...DEFAULT_RATE }, history: [] };
    }
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    return JSON.parse(raw) as StoreData;
  } catch (err) {
    logger.warn({ err }, "Failed to load rate store, using defaults");
    return { currentRate: { ...DEFAULT_RATE }, history: [] };
  }
}

function save(data: StoreData): void {
  try {
    ensureDir();
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    logger.error({ err }, "Failed to save rate store");
  }
}

let _data: StoreData = load();

export function getCurrentRate(): RateEntry {
  return { ..._data.currentRate };
}

export function getHistory(): HistoryEntry[] {
  return [..._data.history];
}

export function updateRate(after: RateEntry, changedBy: string): void {
  const entry: HistoryEntry = {
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
