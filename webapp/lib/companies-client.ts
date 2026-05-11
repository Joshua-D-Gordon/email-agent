"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  type FirestoreError,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Company, DraftedEmail } from "@/lib/types";

type SubscriptionState<T> = {
  data: T;
  loading: boolean;
  error: FirestoreError | null;
};

export function useCompanies(): SubscriptionState<Company[]> {
  const [data, setData] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    const q = query(collection(db, "companies"), orderBy("updatedAt", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        const next: Company[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Company, "id">) }));
        setData(next);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
  }, []);

  return { data, loading, error };
}

export function useCompany(companyId: string): SubscriptionState<Company | null> {
  const [data, setData] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!companyId) return;
    return onSnapshot(
      doc(db, "companies", companyId),
      (snap) => {
        setData(snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Company, "id">) }) : null);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
  }, [companyId]);

  return { data, loading, error };
}

export function useCompanyCurrentEmail(
  companyId: string | null,
): SubscriptionState<DraftedEmail | null> {
  const [data, setData] = useState<DraftedEmail | null>(null);
  const [loading, setLoading] = useState(companyId !== null);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!companyId) {
      setData(null);
      setLoading(false);
      return;
    }
    return onSnapshot(
      doc(db, "companies", companyId, "emails", "current"),
      (snap) => {
        setData(
          snap.exists()
            ? ({ id: snap.id, ...(snap.data() as Omit<DraftedEmail, "id">) })
            : null,
        );
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
  }, [companyId]);

  return { data, loading, error };
}

export function useCompanyPendingEmail(
  companyId: string | null,
): SubscriptionState<DraftedEmail | null> {
  const [data, setData] = useState<DraftedEmail | null>(null);
  const [loading, setLoading] = useState(companyId !== null);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!companyId) {
      setData(null);
      setLoading(false);
      return;
    }
    return onSnapshot(
      doc(db, "companies", companyId, "emails", "pending"),
      (snap) => {
        setData(
          snap.exists()
            ? ({ id: snap.id, ...(snap.data() as Omit<DraftedEmail, "id">) })
            : null,
        );
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
  }, [companyId]);

  return { data, loading, error };
}

export function useCompanyEmails(companyId: string): SubscriptionState<DraftedEmail[]> {
  const [data, setData] = useState<DraftedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!companyId) return;
    const q = query(
      collection(db, "companies", companyId, "emails"),
      orderBy("draftedAt", "desc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        const next: DraftedEmail[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DraftedEmail, "id">) }));
        setData(next);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
  }, [companyId]);

  return { data, loading, error };
}
