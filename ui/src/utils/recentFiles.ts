import { get, set } from 'idb-keyval';

export interface RecentFile {
  id: string;
  name: string;
  bytes: Uint8Array;
  pageCount: number;
  timestamp: number;
}

const RECENT_FILES_KEY = 'lumvalepdf_recent_files';
const MAX_RECENT_FILES = 4; // Show up to 4 recent files nicely in a grid

export async function getRecentFiles(): Promise<RecentFile[]> {
  try {
    const files = await get<RecentFile[]>(RECENT_FILES_KEY);
    return files || [];
  } catch (err) {
    console.error('Failed to get recent files:', err);
    return [];
  }
}

export async function addRecentFile(file: RecentFile): Promise<void> {
  try {
    const files = await getRecentFiles();
    // Remove if already exists (by name to prevent duplicates)
    const filtered = files.filter(f => f.name !== file.name);
    // Add to front
    filtered.unshift(file);
    // Keep only top MAX_RECENT_FILES
    const top = filtered.slice(0, MAX_RECENT_FILES);
    await set(RECENT_FILES_KEY, top);
  } catch (err) {
    console.error('Failed to add recent file:', err);
  }
}

export async function removeRecentFile(name: string): Promise<void> {
  try {
    const files = await getRecentFiles();
    const filtered = files.filter(f => f.name !== name);
    await set(RECENT_FILES_KEY, filtered);
  } catch (err) {
    console.error('Failed to remove recent file:', err);
  }
}
