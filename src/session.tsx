import { createContext, useContext } from "react";

const STORAGE_KEY = "dialroom.key";

export function loadKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveKey(key: string) {
  try {
    if (key) localStorage.setItem(STORAGE_KEY, key);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode or storage blocked: the code just won't be remembered
  }
}

export const KeyContext = createContext<string>("");

export function useKey(): string {
  return useContext(KeyContext);
}
