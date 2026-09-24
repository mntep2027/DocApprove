-- Lists everyone who can see a document (the owning org's members plus
-- every org it's been shared with), so the discussion composer can offer
-- @mention autocomplete. This intentionally does NOT loosen org_members'
-- own RLS (a company's full roster stays private) -- it's a narrow,
-- SECURITY DEFINER, per-document view, gated by the same document-access
-- check used elsewhere.

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
  select * into doc from public.documents where id = p_document_id;
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
