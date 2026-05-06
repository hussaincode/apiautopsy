UPDATE executions
SET assertion_results = jsonb_build_object('results', assertion_results)
WHERE jsonb_typeof(assertion_results) = 'array';

ALTER TABLE executions
    ALTER COLUMN assertion_results SET DEFAULT '{"results":[]}'::jsonb;
