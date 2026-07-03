import { loadImage } from '@napi-rs/canvas';
import { existsSync } from 'fs';
import { join } from 'path';

const ASSETS_DIR = join(process.cwd(), 'assets');
const cache = new Map();

export async function loadAsset(category, filename) {
  const key = `${category}/${filename}`;
  if (cache.has(key)) return cache.get(key);
  const p = join(ASSETS_DIR, category, filename);
  if (!existsSync(p)) return null;
  try {
    const img = await loadImage(p);
    cache.set(key, img);
    return img;
  } catch { return null; }
}

export async function loadBackground(name) { return loadAsset('backgrounds', name); }
export async function loadBadge(name)      { return loadAsset('badges', name); }
export async function loadFrame(name)      { return loadAsset('frames', name); }
export async function loadEffect(name)     { return loadAsset('effects', name); }
export async function loadIcon(name)       { return loadAsset('icons', name); }

export function clearCache() { cache.clear(); }
