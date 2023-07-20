import * as cdk from "aws-cdk-lib";
import { Runtime, Tracing } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AwsPowertoolsNode18FetchStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new NodejsFunction(this, "Node18Fetch", {
      entry: "lib/node-18-fetch.ts",
      runtime: Runtime.NODEJS_18_X,
      tracing: Tracing.ACTIVE,
      timeout: cdk.Duration.seconds(30),
    });
  }
}
