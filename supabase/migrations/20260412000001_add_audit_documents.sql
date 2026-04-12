-- Create audit_documents table
create table if not exists public.audit_documents (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  mime_type text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger
create trigger audit_documents_updated_at
  before update on public.audit_documents
  for each row execute function public.handle_updated_at();

-- RLS
alter table public.audit_documents enable row level security;

create policy "authenticated users can view audit documents"
  on public.audit_documents for select
  to authenticated
  using (true);

create policy "authenticated users can insert audit documents"
  on public.audit_documents for insert
  to authenticated
  with check (true);

create policy "authenticated users can delete audit documents"
  on public.audit_documents for delete
  to authenticated
  using (true);

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('audit-documents', 'audit-documents', false)
on conflict (id) do nothing;

-- Storage RLS
create policy "authenticated users can read audit documents"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'audit-documents');

create policy "authenticated users can upload audit documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'audit-documents');

create policy "authenticated users can delete audit documents"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'audit-documents');
