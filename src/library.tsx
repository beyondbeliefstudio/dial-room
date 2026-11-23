import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useKey } from "./session";
import { DEFAULT_LIBRARY, makeLibrary, type Library, type ScriptCategory } from "./lib/scriptDefaults";

const LibraryContext = createContext<Library>(DEFAULT_LIBRARY);

/** Loads saved script edits once and shares the merged library with every screen. */
export function LibraryProvider({ children }: { children: ReactNode }) {
  const key = useKey();
  const saved = useQuery(api.scripts.list, { key });
  const lib = useMemo(
    () => makeLibrary((saved ?? []).map((r) => ({ ...r, category: r.category as ScriptCategory }))),
    [saved],
  );
  return <LibraryContext.Provider value={lib}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): Library {
  return useContext(LibraryContext);
}
