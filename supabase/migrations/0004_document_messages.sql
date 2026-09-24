-- Discussion chat on shared documents: a flat, chronological message
-- thread per document with optional lightweight reply-to references,
-- visible to both the owning org and any org the document is shared with.

create table public.document_messages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  org_id uuid not null references public.organizations (id),
  author_id uuid not null references public.profiles (id),
  body text not null check (char_length(trim(body)) > 0),
  reply_to_id uuid references public.document_messages (id) on delete set null,
  created_at timestamptz not null default now()
);

create index on public.document_messages (document_id, created_at);

alter table public.document_messages enable row level security;

-- Visible to either side of the document, same shape as the audit_log fix
-- in 0003 (reuses is_org_member / document_owner_org / is_shared_with_my_org).
create policy "messages visible to owner or share recipients" on public.document_messages
  for select using (
    public.is_org_member(org_id)
    or public.is_org_member(public.document_owner_org(document_id))
    or public.is_shared_with_my_org(document_id)
  );

-- Callers can only post as an org they belong to, and only on documents
-- that org actually owns or has been shared.
create policy "org members can message on accessible documents" on public.document_messages
  for insert with check (
    public.is_org_member(org_id)
    and (
      org_id = public.document_owner_org(document_id)
      or exists (
        select 1 from public.document_shares ds
        where ds.document_id = document_messages.document_id
          and ds.shared_with_org_id = document_messages.org_id
      )
    )
  );

-- Deliver new messages live to anyone subscribed on the document.
alter publication supabase_realtime add table public.document_messages;
