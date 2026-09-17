import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Network } from './constructs/network';
import { Data } from './constructs/data';
import { Storage } from './constructs/storage';
import { Jobs } from './constructs/jobs';
import { App } from './constructs/app';
import { Edge } from './constructs/edge';
import { Ops } from './constructs/ops';

/**
 * Single stack for the hackathon (backend-plan.md §13). Constructs map 1:1 to the plan's
 * list: Network, Data, Storage, Jobs, App, Ops — plus Edge (CloudFront + WAF), which the
 * plan folds into Storage but which has to be created after the ALB exists.
 */
export class KeplerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const minAcu = Number(this.node.tryGetContext('minAcu') ?? 0.5);
    const maxAcu = Number(this.node.tryGetContext('maxAcu') ?? 2);
    const wafRateLimit = Number(this.node.tryGetContext('wafRateLimit') ?? 300);
    const alarmEmail = String(this.node.tryGetContext('alarmEmail') ?? '');
    const githubRepo = String(this.node.tryGetContext('githubRepo') ?? '');

    const network = new Network(this, 'Network');
    const data = new Data(this, 'Data', { vpc: network.vpc, minAcu, maxAcu });
    const storage = new Storage(this, 'Storage');

    const models = {
      main: 'global.anthropic.claude-sonnet-5',
      // Haiku 4.5 inference profile id — confirm in the Bedrock console (backend-plan §7.1).
      fast: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
      embed: 'amazon.titan-embed-text-v2:0',
    };

    const jobs = new Jobs(this, 'Jobs', {
      vpc: network.vpc,
      db: data,
      uploadsBucket: storage.uploads,
      assetsBucket: storage.assets,
      models,
    });

    const app = new App(this, 'App', {
      vpc: network.vpc,
      db: data,
      uploadsBucket: storage.uploads,
      assetsBucket: storage.assets,
      jobsQueue: jobs.queue,
      stateMachine: jobs.stateMachine,
      models,
    });

    const edge = new Edge(this, 'Edge', {
      loadBalancer: app.loadBalancer,
      assetsBucket: storage.assets,
      wafRateLimit,
    });
    // The app needs the CDN hostname for slide image URLs; add it after the distribution exists.
    app.container.addEnvironment('ASSETS_CDN_URL', `https://${edge.distribution.distributionDomainName}`);
    app.container.addEnvironment('PUBLIC_BASE_URL', `https://${edge.distribution.distributionDomainName}`);

    new Ops(this, 'Ops', {
      loadBalancer: app.loadBalancer,
      service: app.service,
      dlq: jobs.dlq,
      stateMachine: jobs.stateMachine,
      db: data,
      maxAcu,
      alarmEmail,
      githubRepo,
    });

    new cdk.CfnOutput(this, 'CdnUrl', { value: `https://${edge.distribution.distributionDomainName}` });
    new cdk.CfnOutput(this, 'AlbDns', { value: app.loadBalancer.loadBalancerDnsName });
    new cdk.CfnOutput(this, 'UploadsBucket', { value: storage.uploads.bucketName });
    new cdk.CfnOutput(this, 'AssetsBucket', { value: storage.assets.bucketName });
    new cdk.CfnOutput(this, 'JobsQueueUrl', { value: jobs.queue.queueUrl });
    new cdk.CfnOutput(this, 'ProcessModuleStateMachineArn', { value: jobs.stateMachine.stateMachineArn });
    new cdk.CfnOutput(this, 'DbSecretArn', { value: data.secret.secretArn });
    new cdk.CfnOutput(this, 'DbClusterEndpoint', { value: data.cluster.clusterEndpoint.hostname });
    new cdk.CfnOutput(this, 'EcsClusterName', { value: app.cluster.clusterName });
    new cdk.CfnOutput(this, 'EcsServiceName', { value: app.service.serviceName });
    new cdk.CfnOutput(this, 'WebTaskDefinitionArn', { value: app.service.taskDefinition.taskDefinitionArn });
    new cdk.CfnOutput(this, 'AppSubnetIds', { value: network.vpc.privateSubnets.map((s) => s.subnetId).join(',') });
    new cdk.CfnOutput(this, 'AppSecurityGroupId', { value: app.securityGroup.securityGroupId });
  }
}
