-- TIDA Academy initial schema. Apply only to a dedicated TIDA Academy Supabase project.
create extension if not exists pgcrypto;

create type public.academy_role as enum ('student','coach','mentor','program_manager','super_admin');
create type public.assignment_status as enum ('assigned','submitted','needs_revision','approved');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.academy_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  program_name text not null default 'FROM SURVIVAL TO SYSTEM',
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft' check (status in ('draft','enrollment','active','completed','archived')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.cohort_members (
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active','paused','completed','removed')),
  primary key (cohort_id, student_id)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  level text not null default 'Msingi',
  estimated_hours integer not null default 1 check (estimated_hours > 0),
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  body text not null default '',
  video_url text,
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  cohort_id uuid references public.cohorts(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','active','completed','cancelled')),
  payment_status text not null default 'not_required' check (payment_status in ('not_required','pending','paid','failed','refunded')),
  amount_tzs integer not null default 0 check (amount_tzs >= 0),
  created_at timestamptz not null default now(),
  unique(student_id, cohort_id, course_id)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references public.cohorts(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  title text not null,
  instructions text not null,
  due_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  attachment_path text,
  status public.assignment_status not null default 'submitted',
  score numeric(5,2) check (score >= 0 and score <= 100),
  coach_feedback text,
  reviewed_by uuid references public.profiles(id),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(assignment_id, student_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  cohort_id uuid references public.cohorts(id) on delete set null,
  title text not null,
  problem text not null default '',
  solution text not null default '',
  stage text not null default 'idea' check (stage in ('idea','research','prototype','testing','launched')),
  visibility text not null default 'private' check (visibility in ('private','cohort','public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_progress (
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key(student_id, lesson_id)
);

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  cohort_id uuid references public.cohorts(id) on delete cascade,
  body text not null check (length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  cohort_id uuid references public.cohorts(id) on delete set null,
  certificate_code text not null unique,
  issued_at timestamptz not null default now(),
  unique(student_id, cohort_id)
);

create or replace function public.current_academy_role()
returns public.academy_role
language sql stable security invoker
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create or replace function public.is_academy_staff()
returns boolean
language sql stable security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('coach','mentor','program_manager','super_admin')
  )
$$;

create or replace function public.handle_new_academy_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name',''));
  return new;
end;
$$;

create trigger on_auth_user_created_academy
  after insert on auth.users
  for each row execute procedure public.handle_new_academy_user();

alter table public.profiles enable row level security;
alter table public.cohorts enable row level security;
alter table public.cohort_members enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.projects enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.community_posts enable row level security;
alter table public.certificates enable row level security;

create policy "profiles read self or staff" on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_academy_staff());
create policy "profiles update self" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles staff update" on public.profiles for update to authenticated
using (public.is_academy_staff()) with check (public.is_academy_staff());

create policy "published courses visible" on public.courses for select to anon, authenticated
using (published or public.is_academy_staff());
create policy "published lessons visible" on public.lessons for select to anon, authenticated
using (published or public.is_academy_staff());

create policy "cohorts visible to members or staff" on public.cohorts for select to authenticated
using (public.is_academy_staff() or exists(select 1 from public.cohort_members m where m.cohort_id=id and m.student_id=(select auth.uid())));
create policy "staff manage cohorts" on public.cohorts for all to authenticated
using (public.is_academy_staff()) with check (public.is_academy_staff());

create policy "members see own cohort memberships" on public.cohort_members for select to authenticated
using (student_id=(select auth.uid()) or public.is_academy_staff());
create policy "staff manage memberships" on public.cohort_members for all to authenticated
using (public.is_academy_staff()) with check (public.is_academy_staff());

create policy "students see own enrollments" on public.enrollments for select to authenticated
using (student_id=(select auth.uid()) or public.is_academy_staff());
create policy "students request enrollment" on public.enrollments for insert to authenticated
with check (student_id=(select auth.uid()) and status='pending');
create policy "staff manage enrollments" on public.enrollments for all to authenticated
using (public.is_academy_staff()) with check (public.is_academy_staff());

create policy "assignments visible to assigned cohort or staff" on public.assignments for select to authenticated
using (public.is_academy_staff() or exists(select 1 from public.cohort_members m where m.cohort_id=assignments.cohort_id and m.student_id=(select auth.uid())));
create policy "staff manage assignments" on public.assignments for all to authenticated
using (public.is_academy_staff()) with check (public.is_academy_staff());

create policy "students see own submissions" on public.submissions for select to authenticated
using (student_id=(select auth.uid()) or public.is_academy_staff());
create policy "students submit own work" on public.submissions for insert to authenticated
with check (student_id=(select auth.uid()) and status='submitted' and score is null);
create policy "students revise own submission" on public.submissions for update to authenticated
using (student_id=(select auth.uid()) and status='needs_revision')
with check (student_id=(select auth.uid()) and status='submitted' and score is null);
create policy "staff review submissions" on public.submissions for update to authenticated
using (public.is_academy_staff()) with check (public.is_academy_staff());

create policy "projects visible by owner cohort or public" on public.projects for select to authenticated
using (student_id=(select auth.uid()) or visibility='public' or (visibility='cohort' and exists(select 1 from public.cohort_members m where m.cohort_id=projects.cohort_id and m.student_id=(select auth.uid()))) or public.is_academy_staff());
create policy "students create own projects" on public.projects for insert to authenticated
with check (student_id=(select auth.uid()));
create policy "students update own projects" on public.projects for update to authenticated
using (student_id=(select auth.uid())) with check (student_id=(select auth.uid()));
create policy "staff manage projects" on public.projects for all to authenticated
using (public.is_academy_staff()) with check (public.is_academy_staff());

create policy "students manage own lesson progress" on public.lesson_progress for all to authenticated
using (student_id=(select auth.uid())) with check (student_id=(select auth.uid()));

create policy "cohort members see community posts" on public.community_posts for select to authenticated
using (public.is_academy_staff() or exists(select 1 from public.cohort_members m where m.cohort_id=community_posts.cohort_id and m.student_id=(select auth.uid())));
create policy "members create community posts" on public.community_posts for insert to authenticated
with check (author_id=(select auth.uid()) and exists(select 1 from public.cohort_members m where m.cohort_id=community_posts.cohort_id and m.student_id=(select auth.uid())));
create policy "authors edit own posts" on public.community_posts for update to authenticated
using (author_id=(select auth.uid())) with check (author_id=(select auth.uid()));

create policy "students see own certificates" on public.certificates for select to authenticated
using (student_id=(select auth.uid()) or public.is_academy_staff());
create policy "staff issue certificates" on public.certificates for insert to authenticated
with check (public.is_academy_staff());

grant usage on schema public to anon, authenticated;
grant select on public.courses, public.lessons to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.enrollments, public.projects, public.lesson_progress, public.submissions, public.community_posts to authenticated;
grant select on public.cohorts, public.cohort_members, public.assignments, public.certificates to authenticated;
grant insert, update, delete on public.cohorts, public.cohort_members, public.courses, public.lessons, public.assignments, public.certificates to authenticated;
