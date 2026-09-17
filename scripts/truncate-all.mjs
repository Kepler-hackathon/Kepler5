import postgres from 'postgres';

const sql = postgres('postgresql://postgres:postgres@localhost:5432/keplerlearn');

// Order matters: leaf tables first, then parent tables
const tables = [
  'learning_events',
  'student_progress',
  'chat_messages',
  'chat_threads',
  'faq_upvotes',
  'faq_replies',
  'faq_threads',
  'peer_widget_upvotes',
  'peer_widgets',
  'remediation_feedback',
  'remediation_cache',
  'practice_answers',
  'practice_sessions',
  'lecture_items',
  'quiz_questions',
  'generated_items',
  'generation_jobs',
  'supplementary_drafts',
  'kb_chunks',
  'knowledge_anchors',
  'processing_runs',
  'lecture_processing',
  'slides',
  'lectures',
  'modules',
  'files',
  'courses',
  'users',
];

try {
  for (const table of tables) {
    await sql`TRUNCATE TABLE ${sql(table)} CASCADE`;
    console.log(`✓ truncated ${table}`);
  }
  console.log('\nAll tables cleared. Schema is intact.');
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await sql.end();
}
