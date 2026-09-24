-- No-code approval workflow builder: engine.
-- All writes to workflow_* tables happen through these six
-- SECURITY DEFINER functions.

-- ---------- save_workflow_template ----------
-- Atomic create-or-replace of a template's steps/edges from the builder.
-- Step ids are client-generated (crypto.randomUUID()), so edges can
-- reference them directly without a server-side id-mapping step.
-- Validates the graph is acyclic server-side (Kahn's algorithm) before
-- committing, in addition to the client-side check in the builder.

create or replace function public.save_workflow_template(
  p_org_id uuid,
  p_template_id uuid,
  p_name text,
  p_description text,
  p_steps jsonb,
  p_edges jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template_id uuid;
  v_nodes uuid[];
  v_removed uuid[];
  elem jsonb;
begin
  if not public.is_org_admin(p_org_id) then
    raise exception 'Only org admins can manage workflow templates';
  end if;
  if trim(coalesce(p_name, '')) = '' then
    raise exception 'Template name is required';
  end if;

  select array_agg((s->>'id')::uuid) into v_nodes from jsonb_array_elements(p_steps) s;
  if v_nodes is not null then
    loop
      exit when array_length(v_nodes, 1) is null;
      select array_agg(n) into v_removed
      from unnest(v_nodes) n
      where not exists (
        select 1 from jsonb_array_elements(p_edges) e
        where (e->>'to_step_id')::uuid = n
          and (e->>'from_step_id')::uuid = any(v_nodes)
      );
      if v_removed is null or array_length(v_removed, 1) = 0 then
        raise exception 'Workflow contains a cycle';
      end if;
      select array_agg(x) into v_nodes from unnest(v_nodes) x where not (x = any(v_removed));
    end loop;
  end if;

  if p_template_id is null then
    insert into public.workflow_templates (org_id, name, description, created_by)
    values (p_org_id, p_name, p_description, auth.uid())
    returning id into v_template_id;
  else
    update public.workflow_templates t
    set name = p_name, description = p_description, updated_at = now()
    where t.id = p_template_id and t.org_id = p_org_id
    returning t.id into v_template_id;
    if v_template_id is null then
      raise exception 'Template not found';
    end if;
    delete from public.workflow_template_edges where template_id = v_template_id;
    delete from public.workflow_template_steps where template_id = v_template_id;
  end if;

  for elem in select * from jsonb_array_elements(p_steps)
  loop
    insert into public.workflow_template_steps (
      id, template_id, label, step_type, assignee_mode,
      assignee_org_id, assignee_user_id, assignee_role,
      join_mode, allow_hold, position_x, position_y
    ) values (
      (elem->>'id')::uuid,
      v_template_id,
      elem->>'label',
      elem->>'step_type',
      elem->>'assignee_mode',
      nullif(elem->>'assignee_org_id', '')::uuid,
      nullif(elem->>'assignee_user_id', '')::uuid,
      nullif(elem->>'assignee_role', ''),
      coalesce(elem->>'join_mode', 'all'),
      coalesce((elem->>'allow_hold')::boolean, true),
      coalesce((elem->>'position_x')::double precision, 0),
      coalesce((elem->>'position_y')::double precision, 0)
    );
  end loop;

  for elem in select * from jsonb_array_elements(p_edges)
  loop
    insert into public.workflow_template_edges (template_id, from_step_id, to_step_id)
    values (v_template_id, (elem->>'from_step_id')::uuid, (elem->>'to_step_id')::uuid);
  end loop;

  return v_template_id;
end;
$$;

-- ---------- start_workflow ----------
-- Snapshots a template into a running instance on a document, resolving
-- any external placeholder via p_org_bindings ({template_step_id: org_id}),
-- granting document access to any newly-introduced org, and activating
-- every step with no incoming edge.

create or replace function public.start_workflow(
  p_document_id uuid,
  p_template_id uuid,
  p_org_bindings jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  doc public.documents;
  v_instance_id uuid;
  step_row record;
  edge_row record;
  v_resolved_org_id uuid;
  v_new_step_id uuid;
  v_step_id_map jsonb := '{}'::jsonb;
  v_binding_slug text;
begin
  select d.* into doc from public.documents d where d.id = p_document_id;
  if doc.id is null then
    raise exception 'Document not found';
  end if;
  if not public.is_org_member(doc.org_id) then
    raise exception 'Only the owning organization can start a workflow';
  end if;
  if exists (
    select 1 from public.workflow_instances wi
    where wi.document_id = p_document_id and wi.status = 'in_progress'
  ) then
    raise exception 'A workflow is already in progress for this document';
  end if;

  insert into public.workflow_instances (document_id, version_id, template_id, started_by)
  select p_document_id,
         (select dv.id from public.document_versions dv
          where dv.document_id = p_document_id order by dv.version_number desc limit 1),
         p_template_id,
         auth.uid()
  returning id into v_instance_id;

  for step_row in
    select * from public.workflow_template_steps s where s.template_id = p_template_id
  loop
    v_resolved_org_id := step_row.assignee_org_id;
    if v_resolved_org_id is null then
      v_binding_slug := nullif(p_org_bindings->>step_row.id::text, '');
      if v_binding_slug is null then
        raise exception 'Missing organization for step "%"', step_row.label;
      end if;
      select o.id into v_resolved_org_id from public.organizations o where o.slug = v_binding_slug;
      if v_resolved_org_id is null then
        raise exception 'No organization with slug "%"', v_binding_slug;
      end if;
    end if;

    insert into public.workflow_step_instances (
      workflow_instance_id, template_step_id, label,
      assigned_org_id, assigned_user_id, assigned_role,
      join_mode, allow_hold
    ) values (
      v_instance_id, step_row.id, step_row.label,
      v_resolved_org_id, step_row.assignee_user_id, step_row.assignee_role,
      step_row.join_mode, step_row.allow_hold
    )
    returning id into v_new_step_id;

    v_step_id_map := v_step_id_map || jsonb_build_object(step_row.id::text, v_new_step_id::text);

    if v_resolved_org_id <> doc.org_id then
      insert into public.document_shares (document_id, shared_with_org_id, shared_by, permission)
      values (p_document_id, v_resolved_org_id, auth.uid(), 'approve')
      on conflict (document_id, shared_with_org_id) do nothing;
    end if;
  end loop;

  for edge_row in
    select * from public.workflow_template_edges e where e.template_id = p_template_id
  loop
    insert into public.workflow_step_instance_edges (
      workflow_instance_id, from_step_instance_id, to_step_instance_id
    ) values (
      v_instance_id,
      (v_step_id_map->>edge_row.from_step_id::text)::uuid,
      (v_step_id_map->>edge_row.to_step_id::text)::uuid
    );
  end loop;

  update public.workflow_step_instances si
  set status = 'in_progress'
  where si.workflow_instance_id = v_instance_id
    and si.status = 'pending'
    and not exists (
      select 1 from public.workflow_step_instance_edges e
      where e.workflow_instance_id = v_instance_id and e.to_step_instance_id = si.id
    );

  update public.documents set status = 'pending_approval', updated_at = now() where id = p_document_id;

  insert into public.audit_log (document_id, actor_id, org_id, action, metadata)
  values (p_document_id, auth.uid(), doc.org_id, 'workflow_started', jsonb_build_object('template_id', p_template_id));

  return v_instance_id;
end;
$$;

-- ---------- decide_workflow_step ----------
-- Reject anywhere kills the whole instance and skips every other open
-- step. Approve marks the step, then repeatedly activates any downstream
-- step whose join condition is satisfied (all-join: every predecessor
-- approved; any-join: first predecessor to approve activates it and its
-- still-open sibling predecessors are auto-skipped), until a pass makes
-- no further progress. Completes the instance when every step has
-- reached a terminal state with none rejected.

create or replace function public.decide_workflow_step(
  p_step_instance_id uuid,
  p_decision text,
  p_comment text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  step public.workflow_step_instances;
  v_document_id uuid;
  v_progress boolean;
  downstream record;
  predecessor_count int;
  approved_predecessor_count int;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid decision';
  end if;

  select si.* into step from public.workflow_step_instances si where si.id = p_step_instance_id;
  if step.id is null then
    raise exception 'Step not found';
  end if;
  if step.status <> 'in_progress' then
    raise exception 'This step is not currently awaiting a decision';
  end if;
  if not public.is_org_member(step.assigned_org_id) then
    raise exception 'Not authorized for this step';
  end if;
  if step.assigned_user_id is not null and step.assigned_user_id <> auth.uid() then
    raise exception 'This step is assigned to a specific person';
  end if;

  select wi.document_id into v_document_id from public.workflow_instances wi where wi.id = step.workflow_instance_id;

  update public.workflow_step_instances
  set status = p_decision, decided_by = auth.uid(), decided_at = now(), comment = p_comment
  where id = p_step_instance_id;

  insert into public.audit_log (document_id, actor_id, org_id, action, metadata)
  values (v_document_id, auth.uid(), step.assigned_org_id,
          case when p_decision = 'approved' then 'workflow_step_approved' else 'workflow_step_rejected' end,
          jsonb_build_object('step', step.label, 'comment', p_comment));

  if p_decision = 'rejected' then
    update public.workflow_step_instances
    set status = 'skipped'
    where workflow_instance_id = step.workflow_instance_id
      and status in ('pending', 'in_progress', 'on_hold')
      and id <> p_step_instance_id;

    update public.workflow_instances set status = 'rejected', completed_at = now() where id = step.workflow_instance_id;
    update public.documents set status = 'rejected', updated_at = now() where id = v_document_id;
    return;
  end if;

  loop
    v_progress := false;
    for downstream in
      select * from public.workflow_step_instances si
      where si.workflow_instance_id = step.workflow_instance_id and si.status = 'pending'
    loop
      select count(*) into predecessor_count
      from public.workflow_step_instance_edges e
      where e.workflow_instance_id = step.workflow_instance_id and e.to_step_instance_id = downstream.id;

      select count(*) into approved_predecessor_count
      from public.workflow_step_instance_edges e
      join public.workflow_step_instances p on p.id = e.from_step_instance_id
      where e.workflow_instance_id = step.workflow_instance_id
        and e.to_step_instance_id = downstream.id
        and p.status = 'approved';

      if predecessor_count > 0 and downstream.join_mode = 'all' and approved_predecessor_count = predecessor_count then
        update public.workflow_step_instances set status = 'in_progress' where id = downstream.id;
        v_progress := true;
      elsif predecessor_count > 0 and downstream.join_mode = 'any' and approved_predecessor_count >= 1 then
        update public.workflow_step_instances set status = 'in_progress' where id = downstream.id;
        update public.workflow_step_instances si2
        set status = 'skipped'
        from public.workflow_step_instance_edges e2
        where e2.to_step_instance_id = downstream.id
          and e2.workflow_instance_id = step.workflow_instance_id
          and si2.id = e2.from_step_instance_id
          and si2.status in ('pending', 'in_progress', 'on_hold');
        v_progress := true;
      end if;
    end loop;
    exit when not v_progress;
  end loop;

  if not exists (
    select 1 from public.workflow_step_instances si
    where si.workflow_instance_id = step.workflow_instance_id
      and si.status not in ('approved', 'skipped')
  ) then
    update public.workflow_instances set status = 'completed', completed_at = now() where id = step.workflow_instance_id;
    update public.documents set status = 'approved', updated_at = now() where id = v_document_id;
  end if;
end;
$$;

-- ---------- hold_workflow_step / resume_workflow_step ----------
-- Toggle on_hold <-> in_progress. Both also post into the existing
-- discussion thread so the clarification conversation happens where
-- people already talk about the document.

create or replace function public.hold_workflow_step(p_step_instance_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  step public.workflow_step_instances;
  v_document_id uuid;
  v_version_id uuid;
begin
  if trim(coalesce(p_reason, '')) = '' then
    raise exception 'A reason is required to put a step on hold';
  end if;

  select si.* into step from public.workflow_step_instances si where si.id = p_step_instance_id;
  if step.id is null then
    raise exception 'Step not found';
  end if;
  if step.status <> 'in_progress' then
    raise exception 'This step is not currently active';
  end if;
  if not step.allow_hold then
    raise exception 'This step does not allow holding';
  end if;
  if not public.is_org_member(step.assigned_org_id) then
    raise exception 'Not authorized for this step';
  end if;
  if step.assigned_user_id is not null and step.assigned_user_id <> auth.uid() then
    raise exception 'This step is assigned to a specific person';
  end if;

  update public.workflow_step_instances
  set status = 'on_hold', hold_reason = p_reason
  where id = p_step_instance_id;

  select wi.document_id into v_document_id from public.workflow_instances wi where wi.id = step.workflow_instance_id;
  select dv.id into v_version_id from public.document_versions dv
    where dv.document_id = v_document_id order by dv.version_number desc limit 1;

  insert into public.document_messages (document_id, org_id, author_id, body, version_id)
  values (v_document_id, step.assigned_org_id, auth.uid(), format('Put "%s" on hold: %s', step.label, p_reason), v_version_id);

  insert into public.audit_log (document_id, actor_id, org_id, action, metadata)
  values (v_document_id, auth.uid(), step.assigned_org_id, 'workflow_hold', jsonb_build_object('step', step.label, 'reason', p_reason));
end;
$$;

create or replace function public.resume_workflow_step(p_step_instance_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  step public.workflow_step_instances;
  v_document_id uuid;
  v_version_id uuid;
begin
  select si.* into step from public.workflow_step_instances si where si.id = p_step_instance_id;
  if step.id is null then
    raise exception 'Step not found';
  end if;
  if step.status <> 'on_hold' then
    raise exception 'This step is not on hold';
  end if;
  if not public.is_org_member(step.assigned_org_id) then
    raise exception 'Not authorized for this step';
  end if;
  if step.assigned_user_id is not null and step.assigned_user_id <> auth.uid() then
    raise exception 'This step is assigned to a specific person';
  end if;

  update public.workflow_step_instances
  set status = 'in_progress', hold_reason = null
  where id = p_step_instance_id;

  select wi.document_id into v_document_id from public.workflow_instances wi where wi.id = step.workflow_instance_id;
  select dv.id into v_version_id from public.document_versions dv
    where dv.document_id = v_document_id order by dv.version_number desc limit 1;

  insert into public.document_messages (document_id, org_id, author_id, body, version_id)
  values (v_document_id, step.assigned_org_id, auth.uid(), format('Resumed "%s"', step.label), v_version_id);

  insert into public.audit_log (document_id, actor_id, org_id, action, metadata)
  values (v_document_id, auth.uid(), step.assigned_org_id, 'workflow_resume', jsonb_build_object('step', step.label));
end;
$$;

-- ---------- mark_step_viewed ----------
-- The read-receipt. Called from the document page's server-side load;
-- no-ops silently (not a user-initiated action) if unauthorized or
-- already recorded.

create or replace function public.mark_step_viewed(p_step_instance_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  step public.workflow_step_instances;
begin
  select si.* into step from public.workflow_step_instances si where si.id = p_step_instance_id;
  if step.id is null or step.first_viewed_at is not null then
    return;
  end if;
  if not public.is_org_member(step.assigned_org_id) then
    return;
  end if;
  if step.assigned_user_id is not null and step.assigned_user_id <> auth.uid() then
    return;
  end if;

  update public.workflow_step_instances
  set first_viewed_at = now(), first_viewed_by = auth.uid()
  where id = p_step_instance_id;
end;
$$;
