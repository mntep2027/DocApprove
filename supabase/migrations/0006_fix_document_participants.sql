-- 0005's document_participants() used `returns table (id uuid, ...)`, which
-- implicitly declares id/org_id as OUT-parameter variables in the function's
-- scope. Its lookup query referenced the bare, unqualified column "id",
-- which Postgres then couldn't tell apart from that OUT variable ("column
-- reference \"id\" is ambiguous", 42702). Qualify every column reference.

create or replace function public.document_participants(p_document_id uuid)
returns table (id uuid, full_name text, email text, org_id uuid)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  doc public.documents;
begin
  select d.* into doc from public.documents d where d.id = p_document_id;
  if doc.id is null then
    raise exception 'Document not found';
  end if;
  if not (public.is_org_member(doc.org_id) or public.is_shared_with_my_org(p_document_id)) then
    raise exception 'Not authorized to view participants for this document';
  end if;

  return query
    select p.id, p.full_name, p.email, om.org_id
    from public.org_members om
    join public.profiles p on p.id = om.user_id
    where om.org_id = doc.org_id
       or om.org_id in (
         select ds.shared_with_org_id
         from public.document_shares ds
         where ds.document_id = p_document_id
       );
end;
$$;
