-- Create audit_task_documents table
create table if not exists public.audit_task_documents (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.audit_tasks(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  mime_type text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger
create trigger audit_task_documents_updated_at
  before update on public.audit_task_documents
  for each row execute function public.update_updated_at_column();

-- RLS
alter table public.audit_task_documents enable row level security;

create policy "authenticated users can view audit task documents"
  on public.audit_task_documents for select
  to authenticated
  using (true);

create policy "authenticated users can insert audit task documents"
  on public.audit_task_documents for insert
  to authenticated
  with check (true);

create policy "authenticated users can delete audit task documents"
  on public.audit_task_documents for delete
  to authenticated
  using (true);

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('audit-task-documents', 'audit-task-documents', false)
on conflict (id) do nothing;

-- Storage RLS
create policy "authenticated users can read audit task documents"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'audit-task-documents');

create policy "authenticated users can upload audit task documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'audit-task-documents');

create policy "authenticated users can delete audit task documents"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'audit-task-documents');
