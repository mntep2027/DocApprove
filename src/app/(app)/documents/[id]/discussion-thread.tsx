"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  author_id: string;
  org_id: string;
  body: string;
  reply_to_id: string | null;
  created_at: string;
  sending?: boolean;
};

type Profile = { full_name: string | null; email: string };

function displayName(profile: Profile | undefined, fallbackId: string) {
  if (!profile) return `User ${fallbackId.slice(0, 8)}`;
  return profile.full_name || profile.email;
}

export default function DiscussionThread({
  documentId,
  orgId,
  currentUserId,
  initialMessages,
  initialProfiles,
  orgNames,
  postMessageAction,
}: {
  documentId: string;
  orgId: string;
  currentUserId: string;
  initialMessages: Message[];
  initialProfiles: Record<string, Profile>;
  orgNames: Record<string, string>;
  postMessageAction: (formData: FormData) => Promise<{ error?: string } | void>;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [profiles, setProfiles] = useState<Record<string, Profile>>(initialProfiles);
  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const knownProfileIds = useRef(new Set(Object.keys(initialProfiles)));

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    // @supabase/ssr sets the Realtime auth token asynchronously via an
    // auth-state listener. Subscribing before that resolves opens the
    // channel unauthenticated, so RLS silently drops every change. Wait
    // for the session and set it explicitly first.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`document-messages-${documentId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "document_messages",
            filter: `document_id=eq.${documentId}`,
          },
          (payload) => {
            const row = payload.new as Message;
            setMessages((prev) =>
              prev.some((m) => m.id === row.id)
                ? prev.map((m) => (m.id === row.id ? { ...row, sending: false } : m))
                : [...prev, row]
            );
            if (!knownProfileIds.current.has(row.author_id)) {
              knownProfileIds.current.add(row.author_id);
              supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", row.author_id)
                .single()
                .then(({ data }) => {
                  if (data) {
                    setProfiles((prev) => ({ ...prev, [row.author_id]: data }));
                  }
                });
            }
          }
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [documentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;

    const clientId = crypto.randomUUID();
    const optimistic: Message = {
      id: clientId,
      author_id: currentUserId,
      org_id: orgId,
      body,
      reply_to_id: replyingTo?.id ?? null,
      created_at: new Date().toISOString(),
      sending: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    setReplyingTo(null);
    setError(undefined);
    setSending(true);

    const formData = new FormData();
    formData.set("body", body);
    formData.set("clientId", clientId);
    if (optimistic.reply_to_id) formData.set("replyToId", optimistic.reply_to_id);

    const result = await postMessageAction(formData);
    setSending(false);
    if (result?.error) {
      setMessages((prev) => prev.filter((m) => m.id !== clientId));
      setError(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-h-96 flex-col gap-3 overflow-y-auto rounded-lg border border-surface-border p-4">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-500">No messages yet. Start the discussion.</p>
        )}
        {messages.map((m) => {
          const parent = m.reply_to_id ? messages.find((p) => p.id === m.reply_to_id) : null;
          return (
            <div key={m.id} className={m.sending ? "opacity-60" : undefined}>
              {parent && (
                <div className="mb-1 truncate border-l-2 border-surface-border pl-2 text-xs text-neutral-500">
                  {displayName(profiles[parent.author_id], parent.author_id)}: {parent.body}
                </div>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-foreground">
                  {displayName(profiles[m.author_id], m.author_id)}
                </span>
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-neutral-600">
                  {orgNames[m.org_id] ?? "Unknown company"}
                </span>
                <span className="text-xs text-neutral-400">
                  {new Date(m.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-neutral-800">{m.body}</p>
              <button
                type="button"
                onClick={() => setReplyingTo(m)}
                className="text-xs text-brand hover:underline"
              >
                Reply
              </button>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {replyingTo && (
        <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-xs text-neutral-600">
          <span className="truncate">
            Replying to {displayName(profiles[replyingTo.author_id], replyingTo.author_id)}:{" "}
            {replyingTo.body}
          </span>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="ml-3 shrink-0 text-neutral-500 hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={2}
          placeholder="Write a message..."
          className="flex-1 rounded-lg border border-surface-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          className="self-end rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          Send
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
