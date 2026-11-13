-- CHECK expressions must reject NULL evidence as well as empty strings.
ALTER TABLE sampling_plans ADD CONSTRAINT completed_plan_requires_actor
 CHECK(state <> 'completed' OR completed_by IS NOT NULL);
ALTER TABLE actions ADD CONSTRAINT closed_action_requires_evidence
 CHECK(state <> 'closed' OR (closure_evidence IS NOT NULL AND closed_by IS NOT NULL));
