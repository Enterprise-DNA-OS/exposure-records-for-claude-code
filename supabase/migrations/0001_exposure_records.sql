CREATE FUNCTION touch_updated() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE FUNCTION preserve_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Evidence is append-only; add a new review or note'; END $$;
CREATE TABLE sites (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE CHECK(length(trim(name))>0),
 jurisdiction text NOT NULL CHECK(jurisdiction IN ('NZ','AU')), owner text NOT NULL CHECK(length(trim(owner))>0),
 access_review_due date NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE exposure_groups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), site_id uuid NOT NULL REFERENCES sites,
 name text NOT NULL CHECK(length(trim(name))>0), agent text NOT NULL CHECK(length(trim(agent))>0),
 hazard_kind text NOT NULL CHECK(hazard_kind IN ('asbestos','other')), review_due date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(site_id,name,agent)
);
CREATE TABLE sampling_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), group_id uuid NOT NULL REFERENCES exposure_groups,
 task text NOT NULL CHECK(length(trim(task))>0), owner text NOT NULL CHECK(length(trim(owner))>0), due date NOT NULL,
 state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','completed')), evidence_sample uuid, completed_by text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((state='open' AND evidence_sample IS NULL AND completed_by IS NULL) OR (state='completed' AND evidence_sample IS NOT NULL AND length(trim(completed_by))>0))
);
CREATE TABLE imports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source text NOT NULL CHECK(length(trim(source))>0), fingerprint text NOT NULL,
 source_ref text NOT NULL, expected_count integer NOT NULL CHECK(expected_count>0), actor text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE samples (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), group_id uuid NOT NULL REFERENCES exposure_groups,
 source text NOT NULL CHECK(length(trim(source))>0), source_id text NOT NULL CHECK(length(trim(source_id))>0), import_id uuid REFERENCES imports,
 sampled_on date NOT NULL, recorded_on date NOT NULL CHECK(recorded_on>=sampled_on),
 task text NOT NULL CHECK(length(trim(task))>0), result_text text NOT NULL CHECK(length(trim(result_text))>0),
 units text NOT NULL CHECK(length(trim(units))>0), report_ref text NOT NULL CHECK(length(trim(report_ref))>0),
 method_ref text NOT NULL DEFAULT '', raw jsonb NOT NULL, record_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(source,source_id)
);
ALTER TABLE sampling_plans ADD FOREIGN KEY(evidence_sample) REFERENCES samples;
CREATE TABLE reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sample_id uuid NOT NULL REFERENCES samples,
 revision integer NOT NULL CHECK(revision>0), decision text NOT NULL CHECK(decision IN ('follow_up','record_checked','insufficient_evidence')),
 reviewer text NOT NULL CHECK(length(trim(reviewer))>0), evidence text NOT NULL CHECK(length(trim(evidence))>0),
 reviewed_on date NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(sample_id,revision)
);
CREATE TABLE actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sample_id uuid NOT NULL REFERENCES samples,
 title text NOT NULL CHECK(length(trim(title))>0), owner text NOT NULL CHECK(length(trim(owner))>0), due date NOT NULL,
 state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','closed')), closure_evidence text, closed_by text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((state='open' AND closure_evidence IS NULL AND closed_by IS NULL) OR (state='closed' AND length(trim(closure_evidence))>0 AND length(trim(closed_by))>0))
);
CREATE TABLE notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sample_id uuid NOT NULL REFERENCES samples, actor text NOT NULL CHECK(length(trim(actor))>0),
 body text NOT NULL CHECK(length(trim(body))>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity_id uuid NOT NULL, kind text NOT NULL, actor text NOT NULL CHECK(length(trim(actor))>0), detail jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['sites','exposure_groups','sampling_plans','imports','samples','reviews','actions','notes','events'] LOOP
 EXECUTE format('CREATE TRIGGER touch_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated()',t);
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON %I FROM public',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['imports','samples','reviews','notes','events'] LOOP
 EXECUTE format('CREATE TRIGGER preserve_evidence BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION preserve_evidence()',t);
 END LOOP;
END $$;
CREATE INDEX samples_group ON samples(group_id,sampled_on);
CREATE INDEX reviews_sample ON reviews(sample_id,revision);
CREATE INDEX actions_sample ON actions(sample_id);
CREATE VIEW v_samples AS
 SELECT s.id, s.source, s.source_id, st.name AS site, g.name AS exposure_group,g.agent,g.hazard_kind,st.jurisdiction,
 s.sampled_on,s.recorded_on,s.task,s.result_text,s.units,s.report_ref,s.method_ref,
 COALESCE(r.decision,'unreviewed') AS decision,r.reviewer,r.reviewed_on,
 CASE WHEN st.jurisdiction='NZ' THEN (s.recorded_on + CASE WHEN g.hazard_kind='asbestos' THEN interval '40 years' ELSE interval '30 years' END)::date ELSE NULL END AS nz_retain_until,
 (SELECT count(*)::integer FROM actions a WHERE a.sample_id=s.id AND a.state='open') AS open_actions
 FROM samples s JOIN exposure_groups g ON g.id=s.group_id JOIN sites st ON st.id=g.site_id
 LEFT JOIN LATERAL (SELECT * FROM reviews WHERE sample_id=s.id ORDER BY revision DESC LIMIT 1) r ON true;
CREATE VIEW v_coverage AS
 SELECT g.id,st.name AS site,g.name AS exposure_group,g.agent,g.review_due,
 count(s.id)::integer AS sample_count,max(s.sampled_on) AS last_sample,
 (SELECT count(*)::integer FROM sampling_plans p WHERE p.group_id=g.id AND p.state='open') AS open_plans,
 (SELECT count(*)::integer FROM v_samples v JOIN samples z ON z.id=v.id WHERE z.group_id=g.id AND v.decision='unreviewed') AS unreviewed_samples
 FROM exposure_groups g JOIN sites st ON st.id=g.site_id LEFT JOIN samples s ON s.group_id=g.id GROUP BY g.id,st.name;
CREATE VIEW v_plans AS
 SELECT p.id,st.name AS site,g.name AS exposure_group,g.agent,p.task,p.owner,p.due,p.state,
 (p.state='open' AND p.due<current_date) AS overdue,p.evidence_sample,p.completed_by
 FROM sampling_plans p JOIN exposure_groups g ON g.id=p.group_id JOIN sites st ON st.id=g.site_id;
CREATE VIEW v_actions AS
 SELECT a.id,v.site,v.exposure_group,v.source_id,a.title,a.owner,a.due,a.state,
 (a.state='open' AND a.due<current_date) AS overdue,a.closure_evidence,a.closed_by
 FROM actions a JOIN v_samples v ON v.id=a.sample_id;
CREATE VIEW v_compliance AS
 SELECT 'NZ-retention'::text AS rule,v.id, v.source_id AS record,'retain at least until '||v.nz_retain_until::text AS finding FROM v_samples v WHERE v.jurisdiction='NZ'
 UNION ALL SELECT 'AU-jurisdiction-review',id,source_id,'Confirm applicable state or territory retention and disclosure rules' FROM v_samples WHERE jurisdiction='AU'
 UNION ALL SELECT 'source-method',id,source_id,'Sampling method reference not recorded' FROM v_samples WHERE method_ref=''
 UNION ALL SELECT 'review-pending',id,source_id,'Qualified review evidence is missing' FROM v_samples WHERE decision='unreviewed'
 UNION ALL SELECT 'follow-up-owner',v.id,v.source_id,'Reviewer requested follow-up without an open action' FROM v_samples v WHERE decision='follow_up' AND open_actions=0
 UNION ALL SELECT 'access-review',id,name,'Local access review date has passed' FROM sites WHERE access_review_due<current_date;
CREATE VIEW v_attention AS
 SELECT 'sampling-overdue'::text AS kind,id,site,exposure_group,task AS detail,owner,due FROM v_plans WHERE overdue
 UNION ALL SELECT 'action-overdue',id,site,exposure_group,title,owner,due FROM v_actions WHERE overdue
 UNION ALL SELECT 'group-review-due',c.id,c.site,c.exposure_group,c.agent,s.owner,c.review_due FROM v_coverage c JOIN exposure_groups g ON g.id=c.id JOIN sites s ON s.id=g.site_id WHERE c.review_due<current_date
 UNION ALL SELECT 'sample-review',id,site,exposure_group,source_id,'Qualified reviewer',recorded_on FROM v_samples WHERE decision IN ('unreviewed','insufficient_evidence');
REVOKE ALL ON v_samples,v_coverage,v_plans,v_actions,v_compliance,v_attention FROM public;
