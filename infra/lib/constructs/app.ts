import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { Construct } from 'constructs';
import * as path from 'path';
import { Data } from './data';
import { bedrockInvokePolicy } from './iam';

export interface AppProps {
  vpc: ec2.IVpc;
  db: Data;
  uploadsBucket: s3.IBucket;
  assetsBucket: s3.IBucket;
  jobsQueue: sqs.IQueue;
  stateMachine: sfn.IStateMachine;
  models: { main: string; fast: string; embed: string };
}

/**
 * backend-plan.md §4 (decision B1): Next.js on ECS Fargate behind an ALB.
 *   - 1 vCPU / 2 GB, desired 1, autoscale 1–3 on CPU > 60 %
 *   - ALB idle timeout 300 s (streams), deregistration delay 120 s
 *   - health check GET /api/health, rolling deploy with circuit breaker + rollback
 *   - DB credentials injected from Secrets Manager as DB_* fields (the app composes DATABASE_URL)
 */
export class App extends Construct {
  readonly cluster: ecs.Cluster;
  readonly service: ecs.FargateService;
  readonly loadBalancer: elbv2.ApplicationLoadBalancer;
  readonly container: ecs.ContainerDefinition;
  readonly securityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: AppProps) {
    super(scope, id);
    const stack = cdk.Stack.of(this);

    this.cluster = new ecs.Cluster(this, 'Cluster', { vpc: props.vpc });

    const logGroup = new logs.LogGroup(this, 'WebLogs', {
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const web = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Web', {
      cluster: this.cluster,
      cpu: 1024,
      memoryLimitMiB: 2048,
      desiredCount: 1,
      publicLoadBalancer: true,
      idleTimeout: cdk.Duration.seconds(300),
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      circuitBreaker: { enable: true, rollback: true },
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      healthCheckGracePeriod: cdk.Duration.seconds(90),
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset(path.join(__dirname, '../../..'), {
          platform: Platform.LINUX_ARM64,
          file: 'apps/web/Dockerfile',
        }),
        containerName: 'web',
        containerPort: 3000,
        logDriver: ecs.LogDrivers.awsLogs({ streamPrefix: 'web', logGroup }),
        environment: {
          NODE_ENV: 'production',
          PORT: '3000',
          AWS_REGION: stack.region,
          DEMO_MODE: 'true',
          UPVOTE_THRESHOLD: '5',
          DB_NAME: props.db.databaseName,
          UPLOADS_BUCKET: props.uploadsBucket.bucketName,
          ASSETS_BUCKET: props.assetsBucket.bucketName,
          JOBS_QUEUE_URL: props.jobsQueue.queueUrl,
          PROCESS_MODULE_STATE_MACHINE_ARN: props.stateMachine.stateMachineArn,
          BEDROCK_MODEL_MAIN: props.models.main,
          BEDROCK_MODEL_FAST: props.models.fast,
          BEDROCK_EMBED_MODEL: props.models.embed,
          AI_DISABLED: 'false', // §14.13 row 187 kill switch
        },
        secrets: {
          DB_HOST: ecs.Secret.fromSecretsManager(props.db.secret, 'host'),
          DB_PORT: ecs.Secret.fromSecretsManager(props.db.secret, 'port'),
          DB_USER: ecs.Secret.fromSecretsManager(props.db.secret, 'username'),
          DB_PASSWORD: ecs.Secret.fromSecretsManager(props.db.secret, 'password'),
        },
      },
    });

    this.service = web.service;
    this.loadBalancer = web.loadBalancer;
    this.container = web.taskDefinition.defaultContainer!;
    this.securityGroup = web.service.connections.securityGroups[0];

    web.targetGroup.configureHealthCheck({
      path: '/api/health',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });
    web.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '120');

    web.service
      .autoScaleTaskCount({ minCapacity: 1, maxCapacity: 3 })
      .scaleOnCpuUtilization('Cpu', {
        targetUtilizationPercent: 60,
        scaleInCooldown: cdk.Duration.minutes(5),
        scaleOutCooldown: cdk.Duration.minutes(1),
      });

    // ---- Permissions (§11 task role) ------------------------------------------------------
    const taskRole = web.taskDefinition.taskRole;
    taskRole.addToPrincipalPolicy(bedrockInvokePolicy(stack));
    props.uploadsBucket.grantReadWrite(taskRole); // presigned PUT + HEAD/complete + delete
    props.assetsBucket.grantReadWrite(taskRole);
    props.jobsQueue.grantSendMessages(taskRole);
    props.stateMachine.grantStartExecution(taskRole);
    props.stateMachine.grantRead(taskRole);
    props.stateMachine.grant(taskRole, 'states:StopExecution');
    props.db.secret.grantRead(taskRole);

    props.db.allowFrom(this.securityGroup, 'web (fargate)');
  }
}
