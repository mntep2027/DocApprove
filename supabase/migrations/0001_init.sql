-- DocApprove initial schema: orgs, documents, sharing, approvals, audit log.

create extension if not exists "pgcrypto";

-- ---------- Tables ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.org_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'rejected')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  version_number int not null,
  storage_path text not null,
  file_name text not null,
  file_size bigint not null,
  mime_type text not null,
  uploaded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (document_id, version_number)
);

create table public.document_shares (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  shared_with_org_id uuid not null references public.organizations (id) on delete cascade,
  shared_by uuid not null references public.profiles (id),
  permission text not null default 'approve' check (permission in ('view', 'approve')),
  created_at timestamptz not null default now(),
  unique (document_id, shared_with_org_id)
);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  version_id uuid not null references public.document_versions (id) on delete cascade,
  target_org_id uuid not null references public.organizations (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  comment text,
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  actor_id uuid not null references public.profiles (id),
  org_id uuid not null references public.organizations (id),
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index on public.org_members (user_id);
create index on public.documents (org_id);
create index on public.document_versions (document_id);
create index on public.document_shares (shared_with_org_id);
create index on public.approval_requests (target_org_id);
create index on public.approval_requests (document_id);
create index on public.audit_log (document_id);

-- ---------- Helper functions (SECURITY DEFINER to avoid RLS self-recursion) ----------

create or replace function public.is_org_member(check_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.org_members
    where org_id = check_org_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(check_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.org_members
    where org_id = check_org_id and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

-- ---------- New user -> profile ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Business-logic RPCs ----------

create or replace function public.create_organization(org_name text, org_slug text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org public.organizations;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.organizations (name, slug) values (org_name, org_slug)
  returning * into new_org;

  insert into public.org_members (org_id, user_id, role)
  values (new_org.id, auth.uid(), 'owner');

  return new_org;
end;
$$;

create or replace function public.add_org_member(p_org_id uuid, p_email text, p_role text default 'member')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  if not public.is_org_admin(p_org_id) then
    raise exception 'Only org owners/admins can add members';
  end if;

  select id into target_user_id from public.profiles where email = p_email;
  if target_user_id is null then
    raise exception 'No user with that email has signed up yet';
  end if;

  insert into public.org_members (org_id, user_id, role)
  values (p_org_id, target_user_id, p_role)
  on conflict (org_id, user_id) do update set role = excluded.role;
end;
$$;

create or replace function public.share_document(p_document_id uuid, p_target_org_slug text, p_permission text default 'approve')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  doc public.documents;
  target_org public.organizations;
  latest_version_id uuid;
begin
  select * into doc from public.documents where id = p_document_id;
  if doc.id is null then
    raise exception 'Document not found';
  end if;
  if not public.is_org_member(doc.org_id) then
    raise exception 'Not a member of the owning organization';
  end if;

  select * into target_org from public.organizations where slug = p_target_org_slug;
  if target_org.id is null then
    raise exception 'No organization with that slug';
  end if;
  if target_org.id = doc.org_id then
    raise exception 'Cannot share a document with its own organization';
  end if;

  insert into public.document_shares (document_id, shared_with_org_id, shared_by, permission)
  values (p_document_id, target_org.id, auth.uid(), p_permission)
  on conflict (document_id, shared_with_org_id) do update set permission = excluded.permission;

  if p_permission = 'approve' then
    select id into latest_version_id
    from public.document_versions
    where document_id = p_document_id
    order by version_number desc
    limit 1;

    if latest_version_id is null then
      raise exception 'Document has no uploaded version yet';
    end if;

    insert into public.approval_requests (document_id, version_id, target_org_id, status)
    values (p_document_id, latest_version_id, target_org.id, 'pending');

    update public.documents set status = 'pending_approval', updated_at = now() where id = p_document_id;
  end if;

  insert into public.audit_log (document_id, actor_id, org_id, action, metadata)
  values (p_document_id, auth.uid(), doc.org_id, 'shared', jsonb_build_object('with_org', target_org.slug, 'permission', p_permission));
end;
$$;

create or replace function public.decide_approval(p_request_id uuid, p_decision text, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.approval_requests;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid decision';
  end if;

  select * into req from public.approval_requests where id = p_request_id;
  if req.id is null then
    raise exception 'Approval request not found';
  end if;
  if req.status <> 'pending' then
    raise exception 'This request has already been decided';
  end if;
  if not public.is_org_member(req.target_org_id) then
    raise exception 'Not a member of the requested organization';
  end if;

  update public.approval_requests
  set status = p_decision, comment = p_comment, decided_by = auth.uid(), decided_at = now()
  where id = p_request_id;

  update public.documents set status = p_decision, updated_at = now() where id = req.document_id;

  insert into public.audit_log (document_id, actor_id, org_id, action, metadata)
  values (req.document_id, auth.uid(), req.target_org_id, p_decision, jsonb_build_object('comment', p_comment));
end;
$$;

-- ---------- Row Level Security ----------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_shares enable row level security;
alter table public.approval_requests enable row level security;
alter table public.audit_log enable row level security;

-- profiles: any signed-in user can look up a display name; users manage their own row.
create policy "profiles are readable by authenticated users" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "users update their own profile" on public.profiles
  for update using (id = auth.uid());

-- organizations: names/slugs are discoverable (needed to find a company to share with).
create policy "organizations are readable by authenticated users" on public.organizations
  for select using (auth.role() = 'authenticated');
create policy "authenticated users can create an organization" on public.organizations
  for insert with check (auth.uid() is not null);

-- org_members: visible only to fellow members; invites go through add_org_member().
create policy "members can see their org roster" on public.org_members
  for select using (public.is_org_member(org_id));
create policy "admins can invite members" on public.org_members
  for insert with check (public.is_org_admin(org_id));
create policy "owners can change member roles" on public.org_members
  for update using (public.is_org_admin(org_id));

-- documents: visible to the owning org and any org it's been shared with.
create policy "documents visible to owner or share recipients" on public.documents
  for select using (
    public.is_org_member(org_id)
    or exists (
      select 1 from public.document_shares ds
      where ds.document_id = documents.id and public.is_org_member(ds.shared_with_org_id)
    )
  );
create policy "org members can create documents" on public.documents
  for insert with check (public.is_org_member(org_id));
create policy "org members can edit their org's documents" on public.documents
  for update using (public.is_org_member(org_id));

-- document_versions: same visibility as the parent document.
create policy "versions visible with parent document" on public.document_versions
  for select using (
    exists (
      select 1 from public.documents d
      where d.id = document_versions.document_id
        and (
          public.is_org_member(d.org_id)
          or exists (
            select 1 from public.document_shares ds
            where ds.document_id = d.id and public.is_org_member(ds.shared_with_org_id)
          )
        )
    )
  );
create policy "owner org members can add versions" on public.document_versions
  for insert with check (
    exists (
      select 1 from public.documents d
      where d.id = document_versions.document_id and public.is_org_member(d.org_id)
    )
  );

-- document_shares: visible to either side; writes go through share_document().
create policy "shares visible to either organization" on public.document_shares
  for select using (
    public.is_org_member(shared_with_org_id)
    or exists (
      select 1 from public.documents d
      where d.id = document_shares.document_id and public.is_org_member(d.org_id)
    )
  );

-- approval_requests: visible to either side; writes go through share_document() / decide_approval().
create policy "approval requests visible to either organization" on public.approval_requests
  for select using (
    public.is_org_member(target_org_id)
    or exists (
      select 1 from public.documents d
      where d.id = approval_requests.document_id and public.is_org_member(d.org_id)
    )
  );

-- audit_log: visible to owner org and share recipients; inserted directly for uploads.
create policy "audit log visible to owner or share recipients" on public.audit_log
  for select using (
    public.is_org_member(org_id)
    or exists (
      select 1 from public.document_shares ds
      where ds.document_id = audit_log.document_id and public.is_org_member(ds.shared_with_org_id)
    )
  );
create policy "org members can log actions on their org's documents" on public.audit_log
  for insert with check (public.is_org_member(org_id));

-- ---------- Storage ----------
-- Objects are keyed "<org_id>/<document_id>/<version_id>_<filename>".

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "org members upload into their own org folder" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

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
