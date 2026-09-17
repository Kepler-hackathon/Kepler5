import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';

/**
 * backend-plan.md §11: Bedrock access is IAM only — no API keys anywhere.
 * Global/geo cross-region inference profiles require InvokeModel on the profile ARN *and*
 * on the underlying foundation models in every region the profile can route to, hence the
 * wildcard region on foundation-model ARNs.
 */
export function bedrockInvokePolicy(scope: cdk.Stack): iam.PolicyStatement {
  return new iam.PolicyStatement({
    sid: 'BedrockInvoke',
    actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
    resources: [
      'arn:aws:bedrock:*::foundation-model/*',
      `arn:aws:bedrock:*:${scope.account}:inference-profile/*`,
      `arn:aws:bedrock:*:${scope.account}:application-inference-profile/*`,
    ],
  });
}
