-- Enable pgvector extension (required before kb_chunks uses vector type)
CREATE EXTENSION IF NOT EXISTS vector;

-- HNSW index for fast cosine similarity search on kb_chunks.embedding
CREATE INDEX IF NOT EXISTS kb_chunks_hnsw ON kb_chunks USING hnsw (embedding vector_cosine_ops);

-- Replace the search column on faq_threads with a proper generated tsvector
ALTER TABLE faq_threads DROP COLUMN IF EXISTS search;
ALTER TABLE faq_threads ADD COLUMN search tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body_md, ''))) STORED;

-- GIN index for full-text search on faq_threads
DROP INDEX IF EXISTS faq_threads_search;
CREATE INDEX faq_threads_search ON faq_threads USING gin (search);

-- Deferred unique constraints for safe re-ordering within transactions
ALTER TABLE modules DROP CONSTRAINT IF EXISTS modules_course_id_order_index_unique;
ALTER TABLE modules ADD CONSTRAINT modules_course_id_order_index_unique
  UNIQUE (course_id, order_index) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE lectures DROP CONSTRAINT IF EXISTS lectures_module_id_order_index_unique;
ALTER TABLE lectures ADD CONSTRAINT lectures_module_id_order_index_unique
  UNIQUE (module_id, order_index) DEFERRABLE INITIALLY DEFERRED;
