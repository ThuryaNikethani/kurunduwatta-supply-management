"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Recipe, SupplyList, TransferOut } from "./types";

function useLiveQuery<T>(path: string, constraints: QueryConstraint[], key: string) {
  const [data, setData] = useState<T[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    const q = query(collection(db, path), ...constraints);
    return onSnapshot(
      q,
      (snap) => setData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T)),
      (e) => setError(e),
    );
    // `key` captures the constraints' identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key]);
  return { data, error };
}

export function useSupplyLists() {
  return useLiveQuery<SupplyList>("supplyLists", [orderBy("createdAt", "desc"), limit(200)], "all");
}

export function useTransferOuts() {
  return useLiveQuery<TransferOut>("transferOuts", [orderBy("createdAt", "desc"), limit(200)], "all");
}

export function useTransfersFor(supplyId: string) {
  return useLiveQuery<TransferOut>("transferOuts", [where("supplyId", "==", supplyId)], supplyId);
}

export function useRecipes() {
  const r = useLiveQuery<Recipe>("recipes", [], "all");
  const sorted = r.data
    ? [...r.data].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    : null;
  return { ...r, data: sorted };
}

export function useDocument<T>(path: string, id: string) {
  const [data, setData] = useState<T | null | undefined>(undefined);
  useEffect(() => {
    return onSnapshot(
      doc(db, path, id),
      (s) => setData(s.exists() ? ({ id: s.id, ...s.data() } as T) : null),
      () => setData(null),
    );
  }, [path, id]);
  return data;
}
