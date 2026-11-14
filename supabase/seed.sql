insert into projects(id,code,title,owner,sponsor,problem,goal,process,status,phase,due_on,reviewed_on,personal_data,retention_review_on) values
('10000000-0000-4000-8000-000000000001','IMP-101','Reduce filling line changeovers','Mara Chen','Tane Wilson','Changeovers take 64 minutes','Reach 40 minutes per changeover','Filling line','active','improve',current_date-3,current_date-40,false,null),
('10000000-0000-4000-8000-000000000002','IMP-102','Reduce dispatch corrections','Ellis Brown','Tane Wilson','Dispatch documents require rework','Fewer than 2 corrections per 100 orders','Dispatch','active','measure',current_date+21,current_date-4,true,current_date-1),
('10000000-0000-4000-8000-000000000003','IMP-103','Sustain carton waste reduction','Mara Chen','Tane Wilson','Scrap cartons waste material','Keep waste below 3 percent','Packing','completed','control',current_date-15,current_date-6,false,null),
('10000000-0000-4000-8000-000000000004','IMP-104','Reduce dispatch waiting time','','Tane Wilson','Orders wait for handover','Reduce waiting to one shift','Dispatch','idea','define',current_date+14,null,false,null)
on conflict(code) do nothing;
insert into actions(id,project_id,title,owner,due_on) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Confirm trial changeover instructions','Mara Chen',current_date-2),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Review dispatch sample','Ellis Brown',current_date+2)
on conflict(id) do nothing;
insert into metrics(id,project_id,name,unit,direction,baseline,target,baseline_on,baseline_evidence) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Changeover duration','minutes','lower',64,40,current_date-60,'demo: time study A'),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Dispatch corrections','per 100 orders','lower',7,2,current_date-20,'demo: dispatch sample B'),
('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','Carton waste','percent','lower',6,3,current_date-90,'demo: packing count C')
on conflict(id) do nothing;
insert into observations(id,metric_id,value,observed_on,evidence,actor) values
('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',46,current_date-4,'demo: trial run A','Mara Chen'),
('40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003',4,current_date-2,'demo: control sample C','Mara Chen')
on conflict(id) do nothing;
insert into benefits(id,project_id,title,kind,currency,period_on,amount_cents,evidence,recorded_by,verified_by,verification_evidence,verified_revision,verified_at) values
('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Reduced overtime','hard','NZD',date_trunc('month',current_date)::date,180000,'demo: overtime ledger','Mara Chen',null,null,null,null),
('50000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Released operator capacity','soft','NZD',date_trunc('month',current_date)::date,250000,'demo: capacity worksheet','Mara Chen',null,null,null,null),
('50000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','Carton purchases avoided','hard','NZD',(date_trunc('month',current_date)-interval '1 month')::date,90000,'demo: purchase reconciliation','Mara Chen','Priya Shah','demo: finance review C',1,now()),
('50000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','Dispatch rework avoided','hard','AUD',date_trunc('month',current_date)::date,40000,'demo: Australian site worksheet','Ellis Brown',null,null,null,null)
on conflict(id) do nothing;
insert into controls(id,project_id,title,owner,due_on,cadence_days) values
('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','Weekly carton waste count','Mara Chen',current_date-2,7),
('60000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Confirm changeover method still used','Mara Chen',current_date+4,14)
on conflict(id) do nothing;
insert into control_checks(id,control_id,checked_on,result,evidence,actor) values
('70000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001',current_date-2,'fail','demo: waste count above target','Mara Chen') on conflict(id) do nothing;
insert into phase_reviews(project_id,phase,revision,actor,evidence)
select id,unnest(array['define','measure','analyze','improve','control']),1,'Priya Shah','demo: historical phase review' from projects where code='IMP-103'
on conflict(project_id,phase,revision) do nothing;
