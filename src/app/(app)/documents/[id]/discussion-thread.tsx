"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/spinner";
import { EmptyState } from "@/components/empty-state";
import { ChatIcon, ReplyIcon } from "@/components/icons";

type Message = {
  id: string;
  author_id: string;
  org_id: string;
  body: string;
  reply_to_id: string | null;
  version_id: string;
  created_at: string;
  sending?: boolean;
  isNew?: boolean;
};

type Profile = { full_name: string | null; email: string };
type Participant = { id: string; full_name: string | null; email: string; org_id: string };

function displayName(profile: Profile | undefined, fallbackId: string) {
  if (!profile) return `User ${fallbackId.slice(0, 8)}`;
  return profile.full_name || profile.email;
}

function handleFor(p: { full_name: string | null; email: string }) {
  const base = p.full_name?.trim() || p.email.split("@")[0];
  return base.replace(/\s+/g, "");
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Detects an in-progress "@partial" token right before the cursor.
function findMentionTrigger(text: string, cursor: number) {
  const uptoCursor = text.slice(0, cursor);
  const match = uptoCursor.match(/(?:^|\s)@(\w*)$/);
  if (!match) return null;
  return { start: cursor - match[1].length - 1, query: match[1] };
}

export default function DiscussionThread({
  documentId,
  orgId,
  currentUserId,
  initialMessages,
  initialProfiles,
  orgNames,
  participants,
  versionNumbers,
  currentVersionId,
  postMessageAction,
}: {
  documentId: string;
  orgId: string;
  currentUserId: string;
  initialMessages: Message[];
  initialProfiles: Record<string, Profile>;
  orgNames: Record<string, string>;
  participants: Participant[];
  versionNumbers: Record<string, number>;
  currentVersionId: string;
  postMessageAction: (formData: FormData) => Promise<{ error?: string } | void>;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [profiles, setProfiles] = useState<Record<string, Profile>>(initialProfiles);
  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [mention, setMention] = useState<{ start: number; query: string; index: number } | null>(
    null
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const knownProfileIds = useRef(new Set(Object.keys(initialProfiles)));

  const taggable = useMemo(
    () => participants.filter((p) => p.id !== currentUserId),
    [participants, currentUserId]
  );

  const mentionMatches = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return taggable
      .filter((p) => handleFor(p).toLowerCase().startsWith(q) || (p.full_name ?? "").toLowerCase().startsWith(q))
      .slice(0, 6);
  }, [mention, taggable]);

  const latestVersionNumber = Math.max(0, ...Object.values(versionNumbers));

  const groups = useMemo(() => {
    const result: { versionId: string; messages: Message[] }[] = [];
    for (const m of messages) {
      const last = result[result.length - 1];
      if (last && last.versionId === m.version_id) {
        last.messages.push(m);
      } else {
        result.push({ versionId: m.version_id, messages: [m] });
      }
    }
    return result;
  }, [messages]);

  const handleToLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of [...participants, ...Object.values(profiles)]) {
      map.set(handleFor(p), p.full_name || p.email);
    }
    return map;
  }, [participants, profiles]);

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
                : [...prev, { ...row, isNew: true }]
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

  function updateDraft(value: string, cursor: number) {
    setDraft(value);
    const trigger = findMentionTrigger(value, cursor);
    setMention(trigger ? { ...trigger, index: 0 } : null);
  }

  function selectMention(p: Participant) {
    if (!mention || !textareaRef.current) return;
    const handle = handleFor(p);
    const before = draft.slice(0, mention.start);
    const after = draft.slice(mention.start + 1 + mention.query.length);
    const next = `${before}@${handle} ${after}`;
    setDraft(next);
    setMention(null);
    requestAnimationFrame(() => {
      const pos = before.length + handle.length + 2;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  }

  function renderBody(body: string) {
    if (handleToLabel.size === 0) return body;
    const pattern = new RegExp(
      `@(${[...handleToLabel.keys()].filter(Boolean).map(escapeRegExp).join("|")})\\b`,
      "g"
    );
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(body))) {
      if (match.index > lastIndex) parts.push(body.slice(lastIndex, match.index));
      parts.push(
        <span key={match.index} className="font-medium text-brand-dark">
          @{match[1]}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < body.length) parts.push(body.slice(lastIndex));
    return parts;
  }

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
      version_id: currentVersionId,
      created_at: new Date().toISOString(),
      sending: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    setReplyingTo(null);
    setMention(null);
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
      <div className="flex h-96 flex-col gap-3 overflow-y-auto rounded-lg border border-surface-border p-4 lg:h-[calc(100vh-12rem)]">
        {messages.length === 0 && (
          <EmptyState
            icon={<ChatIcon className="h-8 w-8" />}
            title="No messages yet"
            description="Start the discussion."
          />
        )}
        {groups.map((group) => {
          const versionNumber = versionNumbers[group.versionId];
          const isCurrent = versionNumber === latestVersionNumber;
          return (
            <div key={group.versionId} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-surface-border" />
                <span className="shrink-0 text-xs font-medium text-neutral-500">
                  {versionNumber ? `Version ${versionNumber}` : "Earlier version"}
                  {isCurrent && " · Current"}
                </span>
                <div className="h-px flex-1 bg-surface-border" />
              </div>
              {group.messages.map((m) => {
                const parent = m.reply_to_id ? messages.find((p) => p.id === m.reply_to_id) : null;
                return (
                  <div
                    key={m.id}
                    className={`rounded-lg px-1.5 -mx-1.5 ${m.sending ? "opacity-60" : ""} ${
                      m.isNew ? "animate-message-highlight" : ""
                    }`}
                  >
                    {parent && (
                      <div className="mb-1 truncate border-l-2 border-surface-border pl-2 text-xs text-neutral-500">
                        {displayName(profiles[parent.author_id], parent.author_id)}: {parent.body}
                      </div>
                    )}
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {displayName(profiles[m.author_id], m.author_id)}
                      </span>
                      <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-neutral-600">
                        {orgNames[m.org_id] ?? "Unknown company"}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {new Date(m.created_at).toLocaleString("en-US")}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-800">{renderBody(m.body)}</p>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(m)}
                      className="inline-flex items-center gap-1 text-xs text-brand-dark hover:underline"
                    >
                      <ReplyIcon className="h-3 w-3" />
                      Reply
                    </button>
                  </div>
                );
              })}
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

      <div className="relative flex gap-2">
        {mention && mentionMatches.length > 0 && (
          <ul className="animate-dropdown-in absolute bottom-full mb-1 w-64 overflow-hidden rounded-lg border border-surface-border bg-white shadow-lg">
            {mentionMatches.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => selectMention(p)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface ${
                    i === mention.index ? "bg-surface" : ""
                  }`}
                >
                  <span>{p.full_name || p.email}</span>
                  <span className="text-xs text-neutral-500">{orgNames[p.org_id]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => updateDraft(e.target.value, e.target.selectionStart)}
          onKeyDown={(e) => {
            if (mention && mentionMatches.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setMention({ ...mention, index: (mention.index + 1) % mentionMatches.length });
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setMention({
                  ...mention,
                  index: (mention.index - 1 + mentionMatches.length) % mentionMatches.length,
                });
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                selectMention(mentionMatches[mention.index]);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setMention(null);
                return;
              }
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={2}
          placeholder="Write a message... use @ to mention someone"
          className="flex-1 rounded-lg border border-surface-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-end rounded-lg bg-brand-dark px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {sending && <Spinner />}
          Send
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
