create function touch_updated() returns trigger language plpgsql as $$begin new.updated_at=clock_timestamp();return new;end$$;
create table projects (
 id uuid primary key default gen_random_uuid(), code text not null unique check(code ~ '^[A-Za-z0-9_-]+$'),
 title text not null check(length(trim(title))>0), owner text not null default '', sponsor text not null default '',
 problem text not null default '', goal text not null default '', process text not null default '',
 status text not null default 'idea' check(status in ('idea','active','paused','completed','canceled')),
 phase text not null default 'define' check(phase in ('define','measure','analyze','improve','control')),
 due_on date, retention_review_on date, personal_data boolean not null default false,
 revision integer not null default 1 check(revision>0), reviewed_on date,
 import_source text, external_id text, source_data jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(import_source,external_id)
);
create table actions (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references projects(id),
 title text not null check(length(trim(title))>0), owner text not null default '', due_on date not null,
 status text not null default 'open' check(status in ('open','done','canceled')), evidence text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status<>'done' or length(trim(evidence))>0)
);
create table metrics (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references projects(id),
 name text not null, unit text not null, direction text not null check(direction in ('lower','higher')),
 baseline numeric not null check(baseline <> 'NaN'::numeric), target numeric not null check(target <> 'NaN'::numeric),
 baseline_on date not null, baseline_evidence text not null check(length(trim(baseline_evidence))>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(project_id,name),
 check((direction='lower' and target<baseline) or (direction='higher' and target>baseline))
);
create table observations (
 id uuid primary key default gen_random_uuid(), metric_id uuid not null references metrics(id),
 value numeric not null check(value <> 'NaN'::numeric), observed_on date not null,
 evidence text not null check(length(trim(evidence))>0), actor text not null check(length(trim(actor))>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(metric_id,observed_on)
);
create table benefits (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references projects(id),
 title text not null, kind text not null check(kind in ('hard','soft')), currency text not null check(currency in ('NZD','AUD','USD','EUR','GBP')),
 period_on date not null check(extract(day from period_on)=1), amount_cents bigint not null check(amount_cents>=0 and amount_cents<=9000000000000),
 evidence text not null check(length(trim(evidence))>0), recorded_by text not null, void_reason text, voided_by text,
 verified_by text, verification_evidence text, verified_revision integer, verified_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(project_id,kind,currency,period_on,title),
 check(verified_by is null or (lower(trim(verified_by))<>lower(trim(recorded_by)) and length(trim(verification_evidence))>0))
);
create table phase_reviews (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references projects(id),
 phase text not null check(phase in ('define','measure','analyze','improve','control')), revision integer not null,
 actor text not null, evidence text not null check(length(trim(evidence))>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(project_id,phase,revision)
);
create table controls (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references projects(id),
 title text not null, owner text not null, due_on date not null, cadence_days integer not null check(cadence_days between 1 and 366),
 active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table control_checks (
 id uuid primary key default gen_random_uuid(), sequence bigint generated always as identity unique,
 control_id uuid not null references controls(id), checked_on date not null,
 result text not null check(result in ('pass','fail')), evidence text not null check(length(trim(evidence))>0), actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table activity (
 id uuid primary key default gen_random_uuid(), sequence bigint generated always as identity unique,
 project_id uuid references projects(id), actor text not null, action text not null, note text not null default '',
 before_data jsonb, after_data jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table import_batches (
 id uuid primary key default gen_random_uuid(), source text not null, sha256 text not null, rows_count integer not null, actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(source,sha256)
);
create function revise_project() returns trigger language plpgsql as $$begin
 if (new.title,new.owner,new.sponsor,new.problem,new.goal,new.process,new.due_on,new.personal_data,new.retention_review_on,new.source_data)
 is distinct from (old.title,old.owner,old.sponsor,old.problem,old.goal,old.process,old.due_on,old.personal_data,old.retention_review_on,old.source_data) then
 new.revision=old.revision+1;
 if old.status='completed' then new.status='active';end if;
 end if;return new;end$$;
create trigger project_revision before update on projects for each row execute function revise_project();
do $$declare t text;begin foreach t in array array['projects','actions','metrics','observations','benefits','phase_reviews','controls','control_checks','activity','import_batches'] loop
 execute format('create trigger touch before update on %I for each row execute function touch_updated()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
end loop;end$$;
create index action_project on actions(project_id);create index metric_project on metrics(project_id);
create index benefit_project on benefits(project_id);create index control_project on controls(project_id);
create index activity_project on activity(project_id,sequence desc);
create view v_metrics with(security_invoker=true) as
 select p.code,m.id,m.project_id,m.name,m.unit,m.direction,m.baseline,m.target,o.value as latest_value,o.observed_on,
 case when o.id is null then 'unmeasured' when (m.direction='lower' and o.value<=m.target) or (m.direction='higher' and o.value>=m.target) then 'target_met' else 'off_target' end as result
 from metrics m join projects p on p.id=m.project_id
 left join lateral (select * from observations where metric_id=m.id order by observed_on desc limit 1) o on true;
create view v_benefits with(security_invoker=true) as
 select p.code,p.owner,b.*,case when b.verified_revision=p.revision and b.verified_by is not null then 'verified' when b.verified_by is not null then 'stale' else 'unverified' end as review
 from benefits b join projects p on p.id=b.project_id where b.void_reason is null;
create view v_controls with(security_invoker=true) as
 select p.code,c.*,x.result as last_result,x.checked_on,
 case when x.result='fail' then 'failed' when c.due_on<current_date then 'overdue' when c.due_on<=current_date+7 then 'due_this_week' else 'scheduled' end as finding
 from controls c join projects p on p.id=c.project_id
 left join lateral(select * from control_checks where control_id=c.id order by checked_on desc,sequence desc limit 1)x on true where c.active and p.status<>'canceled';
create view v_portfolio with(security_invoker=true) as
 select p.id,p.code,p.title,p.owner,p.status,p.phase,p.due_on,p.revision,
 (select count(*)::int from actions a where a.project_id=p.id and a.status='open' and a.due_on<current_date) overdue_actions,
 (select count(*)::int from v_benefits b where b.project_id=p.id and b.review<>'verified') benefits_waiting,
 (select count(*)::int from v_controls c where c.project_id=p.id and c.finding in ('overdue','failed')) controls_at_risk,
 (select count(*)::int from phase_reviews r where r.project_id=p.id and r.revision=p.revision) approved_phases
 from projects p;
create view v_attention with(security_invoker=true) as
 select code,title,owner,'overdue_project'::text as finding from projects where status in ('active','idea') and due_on<current_date
 union all select code,title,owner,'missing_owner' from projects where status<>'canceled' and trim(owner)=''
 union all select code,title,owner,'stale_review' from projects where status in ('active','idea') and (reviewed_on is null or reviewed_on<current_date-30)
 union all select p.code,a.title,a.owner,'overdue_action' from actions a join projects p on p.id=a.project_id where a.status='open' and a.due_on<current_date and p.status<>'canceled'
 union all select code,title,owner,'benefit_'||review from v_benefits where review<>'verified'
 union all select code,title,owner,'control_'||finding from v_controls where finding in ('overdue','failed','due_this_week')
 union all select p.code,m.name,p.owner,'metric_off_target' from v_metrics m join projects p on p.id=m.project_id where m.result='off_target' and p.status in ('active','completed')
 union all select code,title,owner,'personal_data_retention' from projects where personal_data and (retention_review_on is null or retention_review_on<current_date);
revoke all on v_metrics,v_benefits,v_controls,v_portfolio,v_attention from public;
