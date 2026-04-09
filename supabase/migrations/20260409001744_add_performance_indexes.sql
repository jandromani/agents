/*
  # Add Performance Indexes

  Adds database indexes for efficient querying across key tables:
  - email_queue: Fast status-based polling for queue processing
  - email_logs: Fast time-range queries by recipient
  - document_chunks: Fast chunk lookups by document and agent
  - rag_queries: Fast query history by agent
  - audit_logs: Fast filtered queries by action and timestamp
*/

CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled
  ON email_queue(status, scheduled_for)
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_email_queue_priority_pending
  ON email_queue(priority DESC, scheduled_for ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_logs_created_at
  ON email_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_logs_to_email_created
  ON email_logs(to_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
  ON document_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_agent_id
  ON document_chunks(agent_id);

CREATE INDEX IF NOT EXISTS idx_rag_queries_agent_created
  ON rag_queries(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp
  ON audit_logs(action, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp
  ON audit_logs(user_id, timestamp DESC);
