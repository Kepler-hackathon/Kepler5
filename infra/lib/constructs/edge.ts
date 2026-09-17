import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export interface EdgeProps {
  loadBalancer: elbv2.IApplicationLoadBalancer;
  assetsBucket: s3.IBucket;
  /** Requests per 5-minute window per IP before WAF blocks (§11, §14.13 row 186). */
  wafRateLimit: number;
}

/**
 * backend-plan.md §4 / §6: CloudFront in front of the ALB and the assets bucket.
 *   default   *              → ALB, no caching, all headers forwarded, streams pass through
 *   /_next/static/*          → ALB, cached (immutable hashed files)
 *   /assets/*                → S3 assets bucket via OAC, cached; prefix stripped so keys stay
 *                              `lectures/{id}/v{n}/...` as in §6
 * Origin read timeout is 60 s (the account-default max); streams stay alive by writing at
 * least every 20 s (heartbeats), see §4.
 * WAF (CLOUDFRONT scope — must be in us-east-1, which is also the stack region).
 */
export class Edge extends Construct {
  readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: EdgeProps) {
    super(scope, id);

    const acl = new wafv2.CfnWebACL(this, 'WebAcl', {
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'KeplerWebAcl', sampledRequestsEnabled: true },
      rules: [
        {
          name: 'RateLimitPerIp',
          priority: 0,
          action: { block: {} },
          statement: { rateBasedStatement: { limit: props.wafRateLimit, aggregateKeyType: 'IP' } },
          visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'RateLimitPerIp', sampledRequestsEnabled: true },
        },
        {
          name: 'AWSManagedCommonRules',
          priority: 1,
          overrideAction: { none: {} },
          statement: { managedRuleGroupStatement: { vendorName: 'AWS', name: 'AWSManagedRulesCommonRuleSet' } },
          visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'CommonRules', sampledRequestsEnabled: true },
        },
      ],
    });

    const albOrigin = new origins.LoadBalancerV2Origin(props.loadBalancer, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
      readTimeout: cdk.Duration.seconds(60),
      keepaliveTimeout: cdk.Duration.seconds(60),
    });

    const stripAssetsPrefix = new cloudfront.Function(this, 'StripAssetsPrefix', {
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var req = event.request;
  if (req.uri.indexOf('/assets/') === 0) { req.uri = req.uri.substring('/assets'.length); }
  return req;
}`),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });

    this.distribution = new cloudfront.Distribution(this, 'Cdn', {
      comment: 'KeplerLearn',
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      webAclId: acl.attrArn,
      defaultBehavior: {
        origin: albOrigin,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true,
      },
      additionalBehaviors: {
        '/_next/static/*': {
          origin: albOrigin,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          compress: true,
        },
        '/assets/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(props.assetsBucket),
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          compress: true,
          functionAssociations: [{ function: stripAssetsPrefix, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST }],
        },
      },
    });
  }
}
