"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { store, type AppUser } from "@/lib/store";

interface SessionValue {
  user: AppUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionValue>({ user: null, loading: true, refresh: async () => {} });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await store.getUser());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    return store.onAuthChange(() => void refresh());
  }, [refresh]);

  return <SessionContext.Provider value={{ user, loading, refresh }}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
