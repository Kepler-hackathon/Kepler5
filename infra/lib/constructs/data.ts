import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface DataProps {
  vpc: ec2.IVpc;
  /** Unused — kept for call-site compatibility with the original Aurora props. */
  minAcu: number;
  maxAcu: number;
}

/**
 * RDS PostgreSQL 16 single instance in the isolated subnets.
 * Uses t4g.micro (free-tier eligible) instead of Aurora Serverless v2,
 * which cannot be created via CloudFormation on free-plan AWS accounts.
 * pgvector is available on RDS PostgreSQL >= 15 — enable it in the first migration.
 */
export class Data extends Construct {
  readonly instance: rds.DatabaseInstance;
  readonly secret: secretsmanager.ISecret;
  readonly securityGroup: ec2.SecurityGroup;
  readonly databaseName = 'kepler';

  constructor(scope: Construct, id: string, props: DataProps) {
    super(scope, id);

    this.securityGroup = new ec2.SecurityGroup(this, 'DbSg', {
      vpc: props.vpc,
      description: 'RDS - ingress only from app and worker security groups',
      allowAllOutbound: false,
    });

    this.instance = new rds.DatabaseInstance(this, 'Instance', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16 }),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [this.securityGroup],
      credentials: rds.Credentials.fromGeneratedSecret('kepler', { secretName: 'kepler/db' }),
      databaseName: this.databaseName,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      allocatedStorage: 20,
      storageType: rds.StorageType.GP2,
      storageEncrypted: true,
      backupRetention: cdk.Duration.days(1),
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      cloudwatchLogsExports: ['postgresql'],
      publiclyAccessible: false,
    });

    this.secret = this.instance.secret!;
  }

  allowFrom(sg: ec2.ISecurityGroup, description: string) {
    this.securityGroup.addIngressRule(sg, ec2.Port.tcp(5432), description);
  }
}
