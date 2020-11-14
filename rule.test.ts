import EventBridge from "aws-sdk/clients/eventbridge";
const bus = new EventBridge();

test("event matches", async () => {
  const pattern = JSON.stringify({
    source: [{ prefix: "" }]
  });

  // You can easily generate this with sam local generate
  const firstEvent = JSON.stringify({
    version: "0",
    id: "bf353018-221a-310d-3b02-fa377eb7a5ad",
    "detail-type": "message",
    source: "sender",
    account: "1234567899",
    time: "2020-11-14T16:12:09Z",
    region: "eu-central-1",
    resources: [],
    detail: {
      message: "hello"
    }
  });

  const { Result } = await bus
    .testEventPattern({ Event: firstEvent, EventPattern: pattern })
    .promise();

  expect(Result).toEqual(true);
});
