"use client";

import { useEffect, useState } from "react";
import { backend } from "./backend";
import type { DocOf } from "./backend/types";
import type { AppNotification, DocKind, Recipe, TransferOut, UserProfile } from "./types";

interface Live<T> {
  data: T | null;
  error: Error | null;
}

export function useDocs<K extends DocKind>(kind: K): Live<DocOf<K>[]> {
  const [state, setState] = useState<Live<DocOf<K>[]>>({ data: null, error: null });
  useEffect(
    () =>
      backend.watchDocs(
        kind,
        (data) => setState({ data, error: null }),
        (error) => setState((s) => ({ ...s, error })),
      ),
    [kind],
  );
  return state;
}

export const useSupplyLists = () => useDocs("supply");
export const useTransferOuts = () => useDocs("transfer");

export function useDoc<K extends DocKind>(kind: K, id: string | null): DocOf<K> | null | undefined {
  const [data, setData] = useState<DocOf<K> | null | undefined>(undefined);
  useEffect(() => {
    if (!id) {
      setData(null);
      return;
    }
    setData(undefined);
    return backend.watchDoc(kind, id, setData);
  }, [kind, id]);
  return data;
}

export function useTransfersFor(supplyId: string) {
  const [data, setData] = useState<TransferOut[] | null>(null);
  useEffect(() => backend.watchTransfersFor(supplyId, setData), [supplyId]);
  return data;
}

export function useRecipes(): Live<Recipe[]> {
  const [state, setState] = useState<Live<Recipe[]>>({ data: null, error: null });
  useEffect(
    () =>
      backend.watchRecipes(
        (r) =>
          setState({
            data: [...r].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)),
            error: null,
          }),
        (error) => setState((s) => ({ ...s, error })),
      ),
    [],
  );
  return state;
}

export function useUsers() {
  const [data, setData] = useState<UserProfile[] | null>(null);
  useEffect(
    () =>
      backend.watchUsers((u) =>
        setData([...u].sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name))),
      ),
    [],
  );
  return data;
}

export function useNotifications(uid: string | undefined) {
  const [data, setData] = useState<AppNotification[] | null>(null);
  useEffect(() => {
    if (!uid) return;
    return backend.watchNotifications(uid, (l) => setData([...l].sort((a, b) => b.createdAt - a.createdAt)));
  }, [uid]);
  return data;
}
