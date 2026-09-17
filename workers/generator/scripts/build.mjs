// Compile-only sanity check: bundles handler.ts with the same options CDK's
// aws-lambda-nodejs.NodejsFunction uses at deploy time (infra/lib/constructs/jobs.ts), so
// bundling failures surface locally instead of only at `cdk deploy`. Not used for local
// invocation — see apps/web/src/lib/local-worker.ts, which imports handler.ts directly.
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [path.join(dir, '../handler.ts')],
  outfile: path.join(dir, '../dist/handler.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  minify: false,
  external: ['@aws-sdk/*'],
});

console.log('workers/generator: bundled dist/handler.mjs');
