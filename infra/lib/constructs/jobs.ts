import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { Construct } from 'constructs';
import * as path from 'path';
import { Data } from './data';
import { bedrockInvokePolicy } from './iam';

export interface JobsProps {
  vpc: ec2.IVpc;
  db: Data;
  uploadsBucket: s3.IBucket;
  assetsBucket: s3.IBucket;
  models: { main: string; fast: string; embed: string };
}

/**
 * backend-plan.md §8: the asynchronous tier.
 *   - SQS "jobs" queue + DLQ → Lambda "generator" (Node; all on-demand job types)
 *   - Lambda "deck-parser" (container: LibreOffice + PyMuPDF + python-pptx; Textract fallback)
 *   - Step Functions "process-module": StartRun → [Map lectures: Parse → (AI opt-in?) Generate] ∥ IngestAnchors → FinishRun
 * State passes ids only (§8.3 payload discipline); content lives in Postgres/S3.
 */
export class Jobs extends Construct {
  readonly queue: sqs.Queue;
  readonly dlq: sqs.Queue;
  readonly generator: nodejs.NodejsFunction;
  readonly deckParser: lambda.DockerImageFunction;
  readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: JobsProps) {
    super(scope, id);
    const stack = cdk.Stack.of(this);

    // ---- Queue -------------------------------------------------------------------------
    this.dlq = new sqs.Queue(this, 'JobsDlq', {
      retentionPeriod: cdk.Duration.days(14),
      enforceSSL: true,
    });
    this.queue = new sqs.Queue(this, 'JobsQueue', {
      visibilityTimeout: cdk.Duration.seconds(720), // 6× the worker timeout (§8.1)
      retentionPeriod: cdk.Duration.days(4),
      enforceSSL: true,
      deadLetterQueue: { queue: this.dlq, maxReceiveCount: 2 },
    });

    // ---- Shared worker networking --------------------------------------------------------
    const workerSg = new ec2.SecurityGroup(this, 'WorkerSg', {
      vpc: props.vpc,
      description: 'Lambda workers (generator, deck-parser)',
      allowAllOutbound: true,
    });
    props.db.allowFrom(workerSg, 'lambda workers');

    const commonEnv = {
      DB_SECRET_ARN: props.db.secret.secretArn,
      DB_NAME: props.db.databaseName,
      UPLOADS_BUCKET: props.uploadsBucket.bucketName,
      ASSETS_BUCKET: props.assetsBucket.bucketName,
      BEDROCK_MODEL_MAIN: props.models.main,
      BEDROCK_MODEL_FAST: props.models.fast,
      BEDROCK_EMBED_MODEL: props.models.embed,
      NODE_OPTIONS: '--enable-source-maps',
    };

    // ---- Generator (Node) ------------------------------------------------------------------
    this.generator = new nodejs.NodejsFunction(this, 'Generator', {
      entry: path.join(__dirname, '../../../workers/generator/handler.ts'),
      depsLockFilePath: path.join(__dirname, '../../../workers/generator/package-lock.json'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(120),
      memorySize: 1024,
      // reservedConcurrentExecutions omitted — free-plan accounts have a low concurrent limit
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [workerSg],
      environment: commonEnv,
      logGroup: new logs.LogGroup(this, 'GeneratorLogs', {
        retention: logs.RetentionDays.TWO_WEEKS,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      tracing: lambda.Tracing.ACTIVE, // §12: X-Ray on the job path
      bundling: {
        target: 'node22',
        format: nodejs.OutputFormat.ESM,
        sourceMap: true,
        minify: false,
        externalModules: ['@aws-sdk/*'],
      },
    });
    this.generator.addEventSource(new SqsEventSource(this.queue, { batchSize: 1 }));
    this.generator.addToRolePolicy(bedrockInvokePolicy(stack));
    props.db.secret.grantRead(this.generator);
    props.uploadsBucket.grantRead(this.generator);
    props.assetsBucket.grantReadWrite(this.generator);

    // ---- Deck parser (Python container) ----------------------------------------------------
    this.deckParser = new lambda.DockerImageFunction(this, 'DeckParser', {
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../../../workers/deck-parser'), {
        platform: Platform.LINUX_ARM64,
      }),
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.minutes(15),
      memorySize: 3008,
      ephemeralStorageSize: cdk.Size.gibibytes(4),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [workerSg],
      environment: { ...commonEnv, HOME: '/tmp' }, // LibreOffice needs a writable profile dir (§9.1)
      logGroup: new logs.LogGroup(this, 'DeckParserLogs', {
        retention: logs.RetentionDays.TWO_WEEKS,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      tracing: lambda.Tracing.ACTIVE,
    });
    this.deckParser.addToRolePolicy(bedrockInvokePolicy(stack)); // embeddings for knowledge anchors
    this.deckParser.addToRolePolicy(
      new iam.PolicyStatement({
        sid: 'TextractOcr',
        actions: ['textract:DetectDocumentText'],
        resources: ['*'], // Textract has no resource-level permissions
      }),
    );
    props.db.secret.grantRead(this.deckParser);
    props.uploadsBucket.grantRead(this.deckParser);
    props.assetsBucket.grantReadWrite(this.deckParser);

    // ---- Step Functions: process-module (§8.3) ----------------------------------------------
    const startRun = new tasks.LambdaInvoke(this, 'StartRun', {
      lambdaFunction: this.generator,
      payload: sfn.TaskInput.fromObject({ task: 'startRun', 'input.$': '$' }),
      resultSelector: {
        'lectureIds.$': '$.Payload.lectureIds',
        'aiOptIn.$': '$.Payload.aiOptIn',
      },
      resultPath: '$.run',
      retryOnServiceExceptions: true,
    });

    const parse = new tasks.LambdaInvoke(this, 'ParseDeck', {
      lambdaFunction: this.deckParser,
      payload: sfn.TaskInput.fromObject({
        task: 'parse',
        'runId.$': '$.runId',
        'moduleId.$': '$.moduleId',
        'lectureId.$': '$.lectureId',
      }),
      resultPath: sfn.JsonPath.DISCARD,
      taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(15)),
      retryOnServiceExceptions: true,
    });
    parse.addRetry({
      errors: ['ParseTransientError'],
      interval: cdk.Duration.seconds(10),
      maxAttempts: 2,
      backoffRate: 2,
    });
    // §14.3 row 37: a failed lecture must not fail the run. The Lambda records the failure
    // in lecture_processing before throwing; here we just swallow and continue.
    const lectureFailed = new sfn.Pass(this, 'LectureFailed', { resultPath: sfn.JsonPath.DISCARD });
    parse.addCatch(lectureFailed, { resultPath: '$.error' });

    const generate = new tasks.LambdaInvoke(this, 'GenerateItems', {
      lambdaFunction: this.generator,
      payload: sfn.TaskInput.fromObject({
        task: 'wizardGenerate',
        'runId.$': '$.runId',
        'moduleId.$': '$.moduleId',
        'lectureId.$': '$.lectureId',
      }),
      resultPath: sfn.JsonPath.DISCARD,
      taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(5)),
      retryOnServiceExceptions: true,
    });
    // §8.3: Bedrock throttling → backoff 5 → 20 → 80 s, then mark the lecture failed.
    generate.addRetry({
      errors: ['ThrottlingException', 'ModelNotReadyException', 'ServiceUnavailableException'],
      interval: cdk.Duration.seconds(5),
      maxAttempts: 3,
      backoffRate: 4,
    });
    const generateFailed = new sfn.Pass(this, 'GenerateFailed', { resultPath: sfn.JsonPath.DISCARD });
    generate.addCatch(generateFailed, { resultPath: '$.error' });

    const skipGenerate = new sfn.Pass(this, 'SkipGenerate');
    const aiOptIn = new sfn.Choice(this, 'AiOptIn?')
      .when(sfn.Condition.booleanEquals('$.aiOptIn', true), generate)
      .otherwise(skipGenerate);

    const lectureDone = new sfn.Pass(this, 'LectureDone');
    parse.next(aiOptIn);
    generate.next(lectureDone);
    generateFailed.next(lectureDone);
    skipGenerate.next(lectureDone);
    lectureFailed.next(lectureDone);

    const lectures = new sfn.Map(this, 'Lectures', {
      itemsPath: '$.run.lectureIds',
      maxConcurrency: 2, // §14.3 row 46
      itemSelector: {
        'lectureId.$': '$$.Map.Item.Value',
        'runId.$': '$.runId',
        'moduleId.$': '$.moduleId',
        'aiOptIn.$': '$.run.aiOptIn',
      },
      resultPath: sfn.JsonPath.DISCARD,
    });
    lectures.itemProcessor(parse);

    const ingestAnchors = new tasks.LambdaInvoke(this, 'IngestAnchors', {
      lambdaFunction: this.deckParser,
      payload: sfn.TaskInput.fromObject({
        task: 'ingestAnchors',
        'runId.$': '$.runId',
        'moduleId.$': '$.moduleId',
      }),
      resultPath: sfn.JsonPath.DISCARD,
      taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(15)),
      retryOnServiceExceptions: true,
    });
    const anchorsFailed = new sfn.Pass(this, 'AnchorsFailed', { resultPath: sfn.JsonPath.DISCARD });
    ingestAnchors.addCatch(anchorsFailed, { resultPath: '$.error' }); // §14.2 row 32: never fail the run

    const process = new sfn.Parallel(this, 'Process', { resultPath: sfn.JsonPath.DISCARD })
      .branch(lectures)
      .branch(ingestAnchors);

    const finishRun = new tasks.LambdaInvoke(this, 'FinishRun', {
      lambdaFunction: this.generator,
      payload: sfn.TaskInput.fromObject({ task: 'finishRun', 'input.$': '$' }),
      resultPath: sfn.JsonPath.DISCARD,
      retryOnServiceExceptions: true,
    });
    // Any unexpected failure still lands in FinishRun so the module never sticks in 'processing'.
    process.addCatch(finishRun, { resultPath: '$.error' });

    const definition = startRun.next(process).next(finishRun);

    this.stateMachine = new sfn.StateMachine(this, 'ProcessModule', {
      stateMachineName: 'kepler-process-module',
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      stateMachineType: sfn.StateMachineType.STANDARD,
      timeout: cdk.Duration.hours(2),
      tracingEnabled: true,
      logs: {
        destination: new logs.LogGroup(this, 'ProcessModuleLogs', {
          retention: logs.RetentionDays.TWO_WEEKS,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
        level: sfn.LogLevel.ERROR,
      },
    });
  }
}
