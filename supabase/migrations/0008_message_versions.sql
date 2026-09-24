-- Tags each discussion message with the document version that was
-- current when it was posted, so the Discussion panel can group
-- messages by version. Backfill existing rows to whichever version was
-- current at each message's created_at, then enforce NOT NULL.

alter table public.document_messages
  add column version_id uuid references public.document_versions (id);

update public.document_messages dm
set version_id = coalesce(
  (
    select dv.id
    from public.document_versions dv
    where dv.document_id = dm.document_id and dv.created_at <= dm.created_at
    order by dv.created_at desc
    limit 1
  ),
  -- Fallback for the unlikely case a message predates every version's
  -- recorded created_at (e.g. clock skew): use the earliest version.
  (
    select dv.id
    from public.document_versions dv
    where dv.document_id = dm.document_id
    order by dv.created_at asc
    limit 1
  )
)
where version_id is null;

alter table public.document_messages
  alter column version_id set not null;

create index on public.document_messages (version_id);
