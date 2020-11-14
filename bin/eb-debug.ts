#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { EBDebugStack } from "../lib/eb-debug-stack";

const app = new cdk.App();
new EBDebugStack(app, "EBDebugStack", {
  env: { region: "eu-central-1" }
});
