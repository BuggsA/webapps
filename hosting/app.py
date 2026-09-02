#!/usr/bin/env python3
import os

import aws_cdk as cdk

from hosting_stack.hosting_stack import HostingStack

app = cdk.App()

HostingStack(
    app,
    "WebappsHostingStack",
    env=cdk.Environment(
        account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
        region=os.environ.get("CDK_DEFAULT_REGION", "us-east-1"),
    ),
    description="Shared S3 + CloudFront hosting for small web apps",
)

app.synth()
