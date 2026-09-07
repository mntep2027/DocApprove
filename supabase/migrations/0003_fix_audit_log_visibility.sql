-- The audit_log SELECT policy only let a document's owner org see entries
-- logged under its own org_id, and let a share recipient see the owner's
-- entries -- but not the reverse. So when a recipient org approves/rejects
-- (logged with org_id = recipient's org), the owner org couldn't see that
-- entry in the document's audit trail. Reuse the SECURITY DEFINER helpers
-- from 0002 so both sides of a shared document see the full trail.

drop policy if exists "audit log visible to owner or share recipients" on public.audit_log;
create policy "audit log visible to owner or share recipients" on public.audit_log
  for select using (
    public.is_org_member(org_id)
    or public.is_org_member(public.document_owner_org(document_id))
    or public.is_shared_with_my_org(document_id)
  );
