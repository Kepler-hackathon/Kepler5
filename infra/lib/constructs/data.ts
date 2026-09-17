import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface DataProps {
  vpc: ec2.IVpc;
  /** 0 enables scale-to-zero (backend-plan §14.13 row 173: keep 0.5 during demo hours). */
  minAcu: number;
  maxAcu: number;
}

/**
 * backend-plan.md §3.1 / §5 (decision B4): Aurora Serverless v2 PostgreSQL 16 in the
 * isolated subnets. Credentials are generated into Secrets Manager; the master user has
 * rds_superuser so the first migration can `create extension vector`.
 */
export class Data extends Construct {
  readonly cluster: rds.DatabaseCluster;
  readonly secret: secretsmanager.ISecret;
  readonly securityGroup: ec2.SecurityGroup;
  readonly databaseName = 'kepler';

  constructor(scope: Construct, id: string, props: DataProps) {
    super(scope, id);

    this.securityGroup = new ec2.SecurityGroup(this, 'DbSg', {
      vpc: props.vpc,
      description: 'Aurora - ingress only from app and worker security groups',
      allowAllOutbound: false,
    });

    const scaleToZero = props.minAcu === 0;

    this.cluster = new rds.DatabaseCluster(this, 'Cluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_16_6 }),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [this.securityGroup],
      credentials: rds.Credentials.fromGeneratedSecret('kepler', { secretName: 'kepler/db' }),
      defaultDatabaseName: this.databaseName,
      serverlessV2MinCapacity: props.minAcu,
      serverlessV2MaxCapacity: props.maxAcu,
      ...(scaleToZero ? { serverlessV2AutoPauseDuration: cdk.Duration.minutes(30) } : {}),
      writer: rds.ClusterInstance.serverlessV2('writer', { publiclyAccessible: false }),
      storageEncrypted: true,
      backup: { retention: cdk.Duration.days(1) },       // §12: hackathon retention
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      cloudwatchLogsExports: ['postgresql'],
    });

    this.secret = this.cluster.secret!;
  }

  /** Allow a client security group to reach Postgres. */
  allowFrom(sg: ec2.ISecurityGroup, description: string) {
    this.securityGroup.addIngressRule(sg, ec2.Port.tcp(5432), description);
  }
}
