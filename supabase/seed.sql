DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM sites WHERE id='10000000-0000-0000-0000-000000000001') THEN RETURN; END IF;
 INSERT INTO sites(id,name,jurisdiction,owner,access_review_due) VALUES
 ('10000000-0000-0000-0000-000000000001','Fictional Harbour Works','NZ','Casey Morgan',current_date-8),
 ('10000000-0000-0000-0000-000000000002','Fictional Inland Works','AU','Ari Patel',current_date+60);
 INSERT INTO exposure_groups(id,site_id,name,agent,hazard_kind,review_due) VALUES
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Mixing crew','Respirable dust','other',current_date-12),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Legacy plant survey','Asbestos','asbestos',current_date+40),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','Mixing crew','Respirable dust','other',current_date+14),
 ('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','Packing crew','Noise','other',current_date-3);
 INSERT INTO samples(id,group_id,source,source_id,sampled_on,recorded_on,task,result_text,units,report_ref,method_ref,raw,record_hash) VALUES
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Demo','DUST-101',current_date-20,current_date-17,'Bag tipping','0.12','mg/m3','DEMO-LAB-101','DEMO-METHOD-1','{}','demo-1'),
 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Demo','DUST-102',current_date-6,current_date-4,'Bag tipping','<0.02','mg/m3','DEMO-LAB-102','DEMO-METHOD-1','{}','demo-2'),
 ('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002','Demo','FIBRE-201',current_date-18,current_date-16,'Plant survey','Not detected','fibres/ml','DEMO-LAB-201','','{}','demo-3'),
 ('30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000003','Demo','DUST-301',current_date-10,current_date-8,'Mixer cleaning','0.08','mg/m3','DEMO-LAB-301','DEMO-METHOD-2','{}','demo-4');
 INSERT INTO reviews(sample_id,revision,decision,reviewer,evidence,reviewed_on) VALUES
 ('30000000-0000-0000-0000-000000000001',1,'follow_up','Demo hygienist','Fictional review: investigate extraction condition',current_date-16),
 ('30000000-0000-0000-0000-000000000003',1,'insufficient_evidence','Demo hygienist','Fictional review: obtain method and survey scope',current_date-15);
 INSERT INTO sampling_plans(group_id,task,owner,due) VALUES
 ('20000000-0000-0000-0000-000000000001','Repeat the agreed bag tipping sample','Casey Morgan',current_date-2),
 ('20000000-0000-0000-0000-000000000004','Arrange competent noise monitoring','Casey Morgan',current_date+4);
 INSERT INTO actions(id,sample_id,title,owner,due) VALUES
 ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Obtain extraction inspection evidence','Casey Morgan',current_date-5);
 INSERT INTO notes(sample_id,actor,body) VALUES('30000000-0000-0000-0000-000000000001','Demo operator','Fictional demonstration only. No safe exposure conclusion is implied.');
END $$;
