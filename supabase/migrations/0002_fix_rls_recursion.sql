-- Fixes infinite recursion (42P17) between the "documents" and
-- "document_shares" RLS policies: each one queried the other table
-- directly, so evaluating either policy required evaluating the other,
-- forever. Route both cross-table checks through SECURITY DEFINER
-- functions (which bypass RLS on the table they query internally),
-- matching the pattern already used by is_org_member()/is_org_admin().

create or replace function public.document_owner_org(check_document_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select org_id from public.documents where id = check_document_id;
$$;

create or replace function public.is_shared_with_my_org(check_document_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.document_shares
    where document_id = check_document_id and public.is_org_member(shared_with_org_id)
  );
$$;

drop policy if exists "documents visible to owner or share recipients" on public.documents;
create policy "documents visible to owner or share recipients" on public.documents
  for select using (
    public.is_org_member(org_id)
    or public.is_shared_with_my_org(id)
  );

drop policy if exists "shares visible to either organization" on public.document_shares;
create policy "shares visible to either organization" on public.document_shares
  for select using (
    public.is_org_member(shared_with_org_id)
    or public.is_org_member(public.document_owner_org(document_id))
  );

-- The storage bucket/policies from 0001 may not have run if the script
-- stopped at the recursion error above; safe to re-run (idempotent).

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "org members upload into their own org folder" on storage.objects;
create policy "org members upload into their own org folder" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "org members and share recipients download" on storage.objects;
create policy "org members and share recipients download" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (
      public.is_org_member(((storage.foldername(name))[1])::uuid)
      or exists (
        select 1 from public.document_shares ds
        where ds.document_id = ((storage.foldername(name))[2])::uuid
          and public.is_org_member(ds.shared_with_org_id)
      )
    )
  );
