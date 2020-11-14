import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2";
import * as events from "@aws-cdk/aws-events";
import * as eventTargets from "@aws-cdk/aws-events-targets";
import * as apigwv2integrations from "@aws-cdk/aws-apigatewayv2-integrations";
import * as iam from "@aws-cdk/aws-iam";
import * as logs from "@aws-cdk/aws-logs";
import * as cr from "@aws-cdk/custom-resources";
import { getFunctionPath } from "./utils/utils";

export class EBDebugStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const debugLogGroup = new logs.LogGroup(this, "EventBridgeLogGroup", {
      // The name has to start with '/aws/events/`
      logGroupName: "/aws/events/EventBridgeLogGroupDebug",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_DAY
    });

    const bus = new events.EventBus(this, "SimpleEventBus");

    const senderLambda = new lambda.Function(this, "sender", {
      code: lambda.Code.fromAsset(getFunctionPath("sender")),
      handler: "handler.handler",
      runtime: lambda.Runtime.NODEJS_12_X,
      environment: {
        EVENT_BUS: bus.eventBusName
      }
    });

    const receiverLambda = new lambda.Function(this, "receiver", {
      code: lambda.Code.fromAsset(getFunctionPath("receiver")),
      handler: "handler.handler",
      runtime: lambda.Runtime.NODEJS_12_X
    });

    senderLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [bus.eventBusArn],
        actions: ["events:PutEvents"]
      })
    );
    senderLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        actions: ["events:TestEventPattern"]
      })
    );

    const receiverTarget = new eventTargets.LambdaFunction(receiverLambda);
    const debugTarget = new LogGroupTarget(debugLogGroup);

    new events.Rule(this, "receiverRule", {
      enabled: true,
      eventBus: bus,
      ruleName: `${this.node.id}-receiverRule`,
      targets: [receiverTarget],
      eventPattern: {
        detail: {
          message: ["hello"]
        }
      }
    });

    new events.Rule(this, "debugRule", {
      enabled: true,
      eventBus: bus,
      ruleName: `${this.node.id}-debugRule`,
      targets: [debugTarget],
      eventPattern: {
        // Normally I would use {prefix: ""} pattern on a `source` property to match everything.
        // Sadly, currently it's not possible with CDK, '{prefix: ""}' string is escaped, which causes the rule not to match.
        detail: {
          message: ["hello"]
        }
      }
    });

    const api = new apigwv2.HttpApi(this, "httpApi");

    const senderIntegration = new apigwv2integrations.LambdaProxyIntegration({
      handler: senderLambda
    });

    api.addRoutes({
      path: "/",
      methods: [apigwv2.HttpMethod.GET],
      integration: senderIntegration
    });

    new cdk.CfnOutput(this, "apiUrl", {
      value: api.url ?? "error"
    });
  }
}

class LogGroupTarget implements events.IRuleTarget {
  constructor(
    private readonly logGroup: logs.LogGroup,
    private readonly props: { event?: events.RuleTargetInput } = {}
  ) {}

  public bind(rule: events.IRule, id: string) {
    const policyName = `${rule.ruleName}-CloudWatchPolicy`;

    const policyDocument = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["logs:PutLogEvents", "logs:CreateLogStream"],
          resources: [this.logGroup.logGroupArn],
          principals: [new iam.ServicePrincipal("events.amazonaws.com")]
        })
      ]
    });

    new cr.AwsCustomResource(this.logGroup.stack, "logGroupIAMResource", {
      resourceType: "Custom::CloudwatchLogResourcePolicy",
      onUpdate: {
        service: "CloudWatchLogs",
        action: "putResourcePolicy",
        parameters: {
          policyName: policyName,
          // iam.policyDocument implements .toJSON function.
          policyDocument: JSON.stringify(policyDocument)
        },
        physicalResourceId: cr.PhysicalResourceId.of(policyName)
      },
      onDelete: {
        service: "CloudWatchLogs",
        action: "deleteResourcePolicy",
        parameters: {
          policyName
        },
        ignoreErrorCodesMatching: "400"
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE
      })
    });

    return {
      id,
      arn: this.logGroup.logGroupArn,
      input: this.props.event,
      targetResource: this.logGroup
    };
  }
}
