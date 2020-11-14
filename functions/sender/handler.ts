import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import EventBridge from "aws-sdk/clients/eventbridge";

const bus = new EventBridge();

const handler: APIGatewayProxyHandlerV2 = async event => {
  const { message = "hello" } = event.queryStringParameters ?? {};

  await bus
    .putEvents({
      Entries: [
        {
          EventBusName: process.env.EVENT_BUS,
          Source: "sender",
          DetailType: "message",
          Time: new Date(),
          Detail: JSON.stringify({
            message
          })
        }
      ]
    })
    .promise();

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "event sent!" })
  };
};

export { handler };
