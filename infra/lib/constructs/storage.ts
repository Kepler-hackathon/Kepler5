import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

/**
 * backend-plan.md §6: two buckets.
 *   uploads — raw decks / textbook / problem bank, written by the browser via presigned PUT
 *   assets  — rendered slides + thumbnails, read only through CloudFront (OAC, see Edge)
 * Both are destroyable for the hackathon (autoDeleteObjects) — flip to RETAIN before real data.
 */
export class Storage extends Construct {
  readonly uploads: s3.Bucket;
  readonly assets: s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.uploads = new s3.Bucket(this, 'Uploads', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      cors: [
        {
          // Presigned PUT from the browser. No auth → no fixed origin; tighten once a domain exists.
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3600,
        },
      ],
      lifecycleRules: [
        { id: 'expire-abandoned-tmp', prefix: 'tmp/', expiration: cdk.Duration.days(1) },
        { id: 'abort-multipart', abortIncompleteMultipartUploadAfter: cdk.Duration.days(1) },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.assets = new s3.Bucket(this, 'Assets', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
  }
}
