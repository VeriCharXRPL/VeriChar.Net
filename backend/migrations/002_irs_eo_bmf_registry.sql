CREATE TABLE IF NOT EXISTS irs_eo_bmf_sync_runs (
  id UUID PRIMARY KEY,
  fetched_at TIMESTAMPTZ NOT NULL,
  source_urls JSONB NOT NULL,
  last_modified JSONB NOT NULL,
  checksums JSONB NOT NULL,
  record_count BIGINT NOT NULL CHECK (record_count >= 0)
);

CREATE TABLE IF NOT EXISTS irs_eo_bmf_records (
  ein CHAR(9) PRIMARY KEY CHECK (ein ~ '^[0-9]{9}$'),
  organization_name TEXT NOT NULL,
  state TEXT NOT NULL,
  subsection_code TEXT NOT NULL,
  deductibility_code TEXT NOT NULL,
  source_region TEXT NOT NULL,
  sync_id UUID NOT NULL REFERENCES irs_eo_bmf_sync_runs(id)
);

CREATE INDEX IF NOT EXISTS irs_eo_bmf_records_subsection_idx
  ON irs_eo_bmf_records (subsection_code);