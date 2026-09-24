-- When the owning org uploads a new document version, any pending
-- approval request (tied to the now-superseded version) is voided and
-- the document goes back to draft until the owner re-shares the new
-- version. Already-decided requests are left alone as history.

create or replace function public.start_new_version(p_document_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  doc public.documents;
begin
  select d.* into doc from public.documents d where d.id = p_document_id;
  if doc.id is null then
    raise exception 'Document not found';
  end if;
  if not public.is_org_member(doc.org_id) then
    raise exception 'Only the owning organization can upload a new version';
  end if;

  delete from public.approval_requests
  where document_id = p_document_id and status = 'pending';

  update public.documents
  set status = 'draft', updated_at = now()
  where id = p_document_id;
end;
$$;
