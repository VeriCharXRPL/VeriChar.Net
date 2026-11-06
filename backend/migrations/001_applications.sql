CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('charity', 'vendor', 'enterprise')),
  public_name TEXT NOT NULL,
  public_summary TEXT NOT NULL DEFAULT '',
  xrpl_account TEXT,
  public_listing BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'in_review', 'verified', 'rejected')),
  private_data BYTEA NOT NULL,
  private_nonce BYTEA NOT NULL,
  private_auth_tag BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS applications_status_created_at_idx
  ON applications (status, created_at);

CREATE INDEX IF NOT EXISTS applications_public_directory_idx
  ON applications (kind, public_listing, public_name)
  WHERE status = 'verified';

CREATE TABLE IF NOT EXISTS application_status_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES applications(id),
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL
    CHECK (to_status IN ('submitted', 'in_review', 'verified', 'rejected')),
  reviewer_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS application_status_events_application_idx
  ON application_status_events (application_id, created_at);
