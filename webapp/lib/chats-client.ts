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
import type { ChatMessage, ChatThread } from "@/lib/chat-types";

type SubscriptionState<T> = {
  data: T;
  loading: boolean;
  error: FirestoreError | null;
};

export function useChatThreads(): SubscriptionState<ChatThread[]> {
  const [data, setData] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    const q = query(collection(db, "chats"), orderBy("updatedAt", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        const next: ChatThread[] = snap.docs.map((d) => ({
          threadId: d.id,
          ...(d.data() as Omit<ChatThread, "threadId">),
        }));
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

export function useChatThread(threadId: string | null): SubscriptionState<ChatThread | null> {
  const [data, setData] = useState<ChatThread | null>(null);
  const [loading, setLoading] = useState(threadId !== null);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!threadId) {
      setData(null);
      setLoading(false);
      return;
    }
    return onSnapshot(
      doc(db, "chats", threadId),
      (snap) => {
        setData(
          snap.exists()
            ? ({ threadId: snap.id, ...(snap.data() as Omit<ChatThread, "threadId">) })
            : null,
        );
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
  }, [threadId]);

  return { data, loading, error };
}

export function useChatMessages(threadId: string | null): SubscriptionState<ChatMessage[]> {
  const [data, setData] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(threadId !== null);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!threadId) {
      setData([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "chats", threadId, "messages"),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        const next: ChatMessage[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ChatMessage, "id">),
        }));
        setData(next);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
  }, [threadId]);

  return { data, loading, error };
}
