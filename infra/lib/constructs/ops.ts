import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cwActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { Data } from './data';

export interface OpsProps {
  loadBalancer: elbv2.ApplicationLoadBalancer;
  service: ecs.FargateService;
  dlq: sqs.IQueue;
  stateMachine: sfn.IStateMachine;
  db: Data;
  maxAcu: number;
  /** Optional e-mail for alarm notifications. */
  alarmEmail: string;
  /** Optional "owner/repo" — creates the GitHub OIDC deploy role (§13 CI). */
  githubRepo: string;
}

/**
 * backend-plan.md §12: the alarm set, plus the CI deploy role from §13.
 * The "jobs failed rate" alarm needs a custom metric the app publishes later (build step 3);
 * everything else is wired here.
 */
export class Ops extends Construct {
  readonly topic: sns.Topic;

  constructor(scope: Construct, id: string, props: OpsProps) {
    super(scope, id);
    const stack = cdk.Stack.of(this);

    this.topic = new sns.Topic(this, 'Alarms', { displayName: 'KeplerLearn alarms' });
    if (props.alarmEmail) {
      this.topic.addSubscription(new subs.EmailSubscription(props.alarmEmail));
    }
    const notify = new cwActions.SnsAction(this.topic);
    const alarm = (a: cloudwatch.Alarm) => {
      a.addAlarmAction(notify);
      a.addOkAction(notify);
      return a;
    };

    // ALB 5xx rate > 2 % over 5 minutes
    const requests = props.loadBalancer.metrics.requestCount({ period: cdk.Duration.minutes(5) });
    const target5xx = props.loadBalancer.metrics.httpCodeTarget(elbv2.HttpCodeTarget.TARGET_5XX_COUNT, {
      period: cdk.Duration.minutes(5),
    });
    alarm(
      new cloudwatch.Alarm(this, 'Alb5xxRate', {
        metric: new cloudwatch.MathExpression({
          expression: 'IF(req > 0, 100 * e5 / req, 0)',
          usingMetrics: { req: requests, e5: target5xx },
          period: cdk.Duration.minutes(5),
          label: 'ALB target 5xx %',
        }),
        threshold: 2,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }),
    );

    alarm(
      new cloudwatch.Alarm(this, 'FargateCpu', {
        metric: props.service.metricCpuUtilization({ period: cdk.Duration.minutes(5) }),
        threshold: 80,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }),
    );

    alarm(
      new cloudwatch.Alarm(this, 'JobsDlqDepth', {
        metric: props.dlq.metricApproximateNumberOfMessagesVisible({ period: cdk.Duration.minutes(1) }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }),
    );

    alarm(
      new cloudwatch.Alarm(this, 'ProcessModuleFailed', {
        metric: props.stateMachine.metricFailed({ period: cdk.Duration.minutes(5) }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }),
    );

    alarm(
      new cloudwatch.Alarm(this, 'AuroraAtMaxCapacity', {
        metric: props.db.cluster.metricServerlessDatabaseCapacity({ period: cdk.Duration.minutes(5) }),
        threshold: props.maxAcu,
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }),
    );

    // ---- GitHub Actions OIDC deploy role (§13) -----------------------------------------------
    if (props.githubRepo) {
      const provider = new iam.OpenIdConnectProvider(this, 'GithubOidc', {
        url: 'https://token.actions.githubusercontent.com',
        clientIds: ['sts.amazonaws.com'],
      });
      const role = new iam.Role(this, 'GithubDeployRole', {
        roleName: 'kepler-github-deploy',
        assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
          StringEquals: { 'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com' },
          StringLike: { 'token.actions.githubusercontent.com:sub': `repo:${props.githubRepo}:*` },
        }),
        description: 'Assumed by GitHub Actions to run cdk deploy (delegates to the CDK bootstrap roles)',
      });
      // Least privilege for `cdk deploy`: assume the bootstrap roles, nothing else directly.
      role.addToPolicy(
        new iam.PolicyStatement({
          actions: ['sts:AssumeRole'],
          resources: [`arn:aws:iam::${stack.account}:role/cdk-*`],
        }),
      );
      // Post-deploy steps in the workflow (run migrations, smoke test) need these reads.
      role.addToPolicy(
        new iam.PolicyStatement({
          actions: ['cloudformation:DescribeStacks', 'ecs:RunTask', 'ecs:DescribeTasks', 'iam:PassRole'],
          resources: ['*'],
        }),
      );
      new cdk.CfnOutput(this, 'GithubDeployRoleArn', { value: role.roleArn });
    }
  }
}
