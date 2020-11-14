# EventBridge Debugging

[THERE IS OPEN MR TO MAKE ALL THE THINGS I DID HERE MUCH SIMPLER](https://github.com/aws/aws-cdk/pull/10598)

This is an example of 2 things

1. Testing event patterns. You can find the code inside the `rule.test.ts` file.

2. Creating _CloudWatch Log Group_ as a event bus target. This will enable you to easily view all the events that are send through the bus.

There is one output - the URL of the `sender` lambda. Perform a simple `GET` request to send a event to the bus.

## Useful commands

- `npm run build` compile everything
- `npm run deploy` deploy stuff
- `npm run test` perform the jest unit tests
