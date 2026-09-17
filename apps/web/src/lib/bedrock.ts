import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { defaultProvider } from '@aws-sdk/credential-provider-node'

// @ai-sdk/amazon-bedrock only resolves credentials from an explicit `credentialProvider`, or
// the plain AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/AWS_SESSION_TOKEN env vars — unlike a raw
// @aws-sdk/client-* (e.g. the S3 client used elsewhere in this app for uploads), it never falls
// back to ~/.aws/credentials, SSO, or IMDS. In a deployed Lambda that's moot (the runtime
// injects those exact env vars for the execution role), but in local dev — where ambient AWS
// auth comes from ~/.aws/credentials, not env vars — every Bedrock call failed with "AWS access
// key ID setting is missing" even though S3 calls in the same process worked fine. This shared
// instance is the one place every route/lib in this app should get a Bedrock provider from,
// so this fix (and any future one) only needs making once. workers/generator/handler.ts has
// its own copy of this same fix — that package can't import from apps/web/src/lib.
export const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION ?? 'us-east-1',
  credentialProvider: defaultProvider(),
})
