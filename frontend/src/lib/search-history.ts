import { AgentChatResponse } from "./api/agent";

export interface SearchHistoryItem {
  id: string;
  query: string;
  normalizedQuery: string;
  timestamp: number;
  response: AgentChatResponse;
}

const STORAGE_KEY = "agentcart_search_history_v1";
const MAX_HISTORY_ITEMS = 20;

/**
 * Normalizes query string for reliable deduplication and cache hits:
 * converts to lowercase, strips trailing/leading punctuation, normalizes multiple spaces.
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[?.!]+$/, "")
    .replace(/\s+/g, " ");
}

/**
 * Retrieves full search history from localStorage (client-side only).
 */
export function getSearchHistory(): SearchHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error("Failed to load search history:", err);
    return [];
  }
}

/**
 * Retrieves a cached search response for a given query if available.
 */
export function getCachedSearch(query: string): SearchHistoryItem | null {
  const norm = normalizeQuery(query);
  if (!norm) return null;
  const history = getSearchHistory();
  const match = history.find((item) => item.normalizedQuery === norm);
  return match || null;
}

/**
 * Saves a new search result into history and local storage.
 * If query already exists, updates it and moves it to the front of history.
 */
export function saveSearchResult(query: string, response: AgentChatResponse): SearchHistoryItem {
  const norm = normalizeQuery(query);
  const history = getSearchHistory();
  
  // Filter out any existing match for this normalized query
  const filtered = history.filter((item) => item.normalizedQuery !== norm);

  const newItem: SearchHistoryItem = {
    id: `search_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    query: query.trim(),
    normalizedQuery: norm,
    timestamp: Date.now(),
    response,
  };

  // Prepend new item, capped at MAX_HISTORY_ITEMS
  const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save search to localStorage:", err);
    }
  }

  return newItem;
}

/**
 * Removes a specific search history item by ID.
 */
export function removeSearchItem(id: string): SearchHistoryItem[] {
  const history = getSearchHistory();
  const updated = history.filter((item) => item.id !== id);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to remove search item from localStorage:", err);
    }
  }
  return updated;
}

/**
 * Clears all search history.
 */
export function clearSearchHistory(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error("Failed to clear search history:", err);
    }
  }
}
