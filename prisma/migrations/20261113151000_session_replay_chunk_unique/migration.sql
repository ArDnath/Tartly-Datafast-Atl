-- One row per session chunk. A retry or an abusive client must not grow
-- unbounded duplicate rows for a single replay session.
CREATE UNIQUE INDEX IF NOT EXISTS "session_replay_session_id_chunk_index_key"
  ON "session_replay"("session_id", "chunk_index");
