import { EventBridgeHandler } from "aws-lambda";
import Log from "@dazn/lambda-powertools-logger";

const handler: EventBridgeHandler<any, any, any> = async event => {
  console.log(event);
  // Log.info("event arrived", event);
};

export { handler };
