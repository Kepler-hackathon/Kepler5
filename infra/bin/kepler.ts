#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { KeplerStack } from '../lib/kepler-stack';

const app = new cdk.App();

// backend-plan.md §3.2: one region, us-east-1 (Bedrock breadth + global inference profiles).
// The region is fixed in cdk.json context rather than taken from the CLI profile so a
// profile defaulting to another region (e.g. us-west-2) cannot deploy to the wrong place.
const region = app.node.tryGetContext('region') ?? 'us-east-1';

new KeplerStack(app, 'KeplerStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region },
  description: 'KeplerLearn — full environment (docs/backend-plan.md)',
  tags: { Project: 'KeplerLearn', ManagedBy: 'cdk' },
});
