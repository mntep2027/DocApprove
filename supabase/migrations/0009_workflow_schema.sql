-- No-code approval workflow builder: schema.
-- Templates (org-owned, reusable) hold steps + edges forming a DAG.
-- Starting a workflow on a document snapshots the template into an
-- instance (step_instances + edges), so later template edits never
-- retroactively change an in-flight run. All writes to these tables
-- happen through the RPCs in 0010_workflow_engine.sql (SECURITY
-- DEFINER), so only SELECT policies are defined here.

create table public.workflow_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workflow_template_steps (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workflow_templates (id) on delete cascade,
  label text not null,
  step_type text not null check (step_type in ('internal', 'external')),
  assignee_mode text not null check (assignee_mode in ('org_member', 'specific_user', 'org_role')),
  -- null assignee_org_id on an external step is a placeholder, resolved
  -- to a real org when the workflow is started on a document.
  assignee_org_id uuid references public.organizations (id),
  assignee_user_id uuid references public.profiles (id),
  assignee_role text check (assignee_role in ('owner', 'admin', 'member')),
  join_mode text not null default 'all' check (join_mode in ('all', 'any')),
  allow_hold boolean not null default true,
  position_x double precision not null default 0,
  position_y double precision not null default 0
);

create table public.workflow_template_edges (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workflow_templates (id) on delete cascade,
  from_step_id uuid not null references public.workflow_template_steps (id) on delete cascade,
  to_step_id uuid not null references public.workflow_template_steps (id) on delete cascade
);

create index on public.workflow_template_steps (template_id);
create index on public.workflow_template_edges (template_id);

create table public.workflow_instances (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  version_id uuid not null references public.document_versions (id),
  template_id uuid references public.workflow_templates (id),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'rejected', 'cancelled')),
  started_by uuid not null references public.profiles (id),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index on public.workflow_instances (document_id);

-- At most one active run per document.
create unique index workflow_instances_one_active_per_document
  on public.workflow_instances (document_id)
  where status = 'in_progress';

create table public.workflow_step_instances (
  id uuid primary key default gen_random_uuid(),
  workflow_instance_id uuid not null references public.workflow_instances (id) on delete cascade,
  template_step_id uuid references public.workflow_template_steps (id) on delete set null,
  label text not null,
  assigned_org_id uuid not null references public.organizations (id),
  assigned_user_id uuid references public.profiles (id),
  assigned_role text,
  join_mode text not null default 'all' check (join_mode in ('all', 'any')),
  allow_hold boolean not null default true,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'on_hold', 'approved', 'rejected', 'skipped')),
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  comment text,
  hold_reason text,
  first_viewed_at timestamptz,
  first_viewed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index on public.workflow_step_instances (workflow_instance_id);
create index on public.workflow_step_instances (assigned_org_id);

create table public.workflow_step_instance_edges (
  id uuid primary key default gen_random_uuid(),
  workflow_instance_id uuid not null references public.workflow_instances (id) on delete cascade,
  from_step_instance_id uuid not null references public.workflow_step_instances (id) on delete cascade,
  to_step_instance_id uuid not null references public.workflow_step_instances (id) on delete cascade
);

create index on public.workflow_step_instance_edges (workflow_instance_id);
create index on public.workflow_step_instance_edges (to_step_instance_id);

-- ---------- Helper ----------

create or replace function public.template_owner_org(check_template_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select org_id from public.workflow_templates where id = check_template_id;
$$;

-- ---------- RLS ----------

alter table public.workflow_templates enable row level security;
alter table public.workflow_template_steps enable row level security;
alter table public.workflow_template_edges enable row level security;
alter table public.workflow_instances enable row level security;
alter table public.workflow_step_instances enable row level security;
alter table public.workflow_step_instance_edges enable row level security;

create policy "org members can view their templates" on public.workflow_templates
  for select using (public.is_org_member(org_id));

create policy "org members can view template steps" on public.workflow_template_steps
  for select using (public.is_org_member(public.template_owner_org(template_id)));

create policy "org members can view template edges" on public.workflow_template_edges
  for select using (public.is_org_member(public.template_owner_org(template_id)));

create policy "workflow visible to owner or share recipients" on public.workflow_instances
  for select using (
    public.is_org_member(public.document_owner_org(document_id))
    or public.is_shared_with_my_org(document_id)
  );

create policy "workflow steps visible to owner or share recipients" on public.workflow_step_instances
  for select using (
    exists (
      select 1 from public.workflow_instances wi
      where wi.id = workflow_step_instances.workflow_instance_id
        and (
          public.is_org_member(public.document_owner_org(wi.document_id))
          or public.is_shared_with_my_org(wi.document_id)
        )
    )
  );

create policy "workflow step edges visible to owner or share recipients" on public.workflow_step_instance_edges
  for select using (
    exists (
      select 1 from public.workflow_instances wi
      where wi.id = workflow_step_instance_edges.workflow_instance_id
        and (
          public.is_org_member(public.document_owner_org(wi.document_id))
          or public.is_shared_with_my_org(wi.document_id)
        )
    )
  );
