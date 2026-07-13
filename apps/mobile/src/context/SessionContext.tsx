import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { TabMode } from '@tableflow/types';
import { apiFetch } from '../lib/api';
import {
  EMPTY_SESSION,
  SESSION_STORAGE_KEY,
  isSessionValid,
  parseStoredSession,
  type StoredSession,
} from '../utils/sessionStorage';

interface SessionContextValue extends StoredSession {
  isReady: boolean;
  setSession: (data: Partial<StoredSession>) => Promise<void>;
  clearSession: () => Promise<void>;
  setActiveOrderId: (orderId: string | null) => void;
  setTipPercent: (tip: number) => void;
  setPaymentIntentId: (id: string | null) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

async function persistSession(state: StoredSession) {
  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(state));
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoredSession>(EMPTY_SESSION);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function restore() {
      try {
        const saved = parseStoredSession(await SecureStore.getItemAsync(SESSION_STORAGE_KEY));
        if (!isSessionValid(saved)) return;

        try {
          await apiFetch(`/sessions/${saved!.sessionId}`, {
            headers: { Authorization: `Bearer ${saved!.sessionToken}` },
          });
          setState(saved!);
        } catch {
          await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
        }
      } finally {
        setIsReady(true);
      }
    }
    restore();
  }, []);

  const setSession = useCallback(async (data: Partial<StoredSession>) => {
    setState((prev) => {
      const next = { ...prev, ...data };
      void persistSession(next);
      return next;
    });
  }, []);

  const setActiveOrderId = useCallback((orderId: string | null) => {
    setState((prev) => {
      const next = { ...prev, activeOrderId: orderId };
      void persistSession(next);
      return next;
    });
  }, []);

  const setTipPercent = useCallback((tip: number) => {
    setState((prev) => {
      const next = { ...prev, tipPercent: tip };
      void persistSession(next);
      return next;
    });
  }, []);

  const setPaymentIntentId = useCallback((id: string | null) => {
    setState((prev) => {
      const next = { ...prev, paymentIntentId: id };
      void persistSession(next);
      return next;
    });
  }, []);

  const clearSession = useCallback(async () => {
    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
    setState(EMPTY_SESSION);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        ...state,
        isReady,
        setSession,
        clearSession,
        setActiveOrderId,
        setTipPercent,
        setPaymentIntentId,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

export type { TabMode };
