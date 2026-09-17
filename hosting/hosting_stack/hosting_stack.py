"""Shared hosting for every small web app.

One private S3 bucket + one CloudFront distribution. Apps are served at
path prefixes: an app in `apps/<name>/` is synced to `s3://<bucket>/<name>/`
and served at `https://<distribution-domain>/<name>/`.

Deliberately minimal: no DNS, no per-app certificate, no per-app stack.
Adding an app is an `s3 sync` + a scoped CloudFront invalidation -- it does
not touch this stack.
"""

from aws_cdk import (
    Stack,
    CfnOutput,
    RemovalPolicy,
    Duration,
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_budgets as budgets,
)
from constructs import Construct


class HostingStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # --- Static asset bucket -------------------------------------------------
        # Private. Reachable only through the CloudFront Origin Access Control
        # below -- there is no public bucket policy. Versioned so a bad
        # `s3 sync --delete` is recoverable. RETAIN so tearing down this stack
        # never silently deletes every app that was ever shipped.
        bucket = s3.Bucket(
            self,
            "AppsBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
            enforce_ssl=True,
            versioned=True,
            removal_policy=RemovalPolicy.RETAIN,
        )

        # --- URI rewrite: /<name>/ and /<name> -> /<name>/index.html -----------
        # CloudFront does not apply `default_root_object` to sub-paths, so a
        # request for `/picker/` would 403 against the bucket. This viewer
        # function rewrites directory-style URIs to their index.html.
        rewrite_fn = cloudfront.Function(
            self,
            "IndexRewrite",
            comment="Rewrite directory URIs to index.html for path-prefixed apps",
            runtime=cloudfront.FunctionRuntime.JS_2_0,
            code=cloudfront.FunctionCode.from_inline(
                """
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    if (uri.endsWith('/')) {
        request.uri = uri + 'index.html';
    } else if (uri.lastIndexOf('.') <= uri.lastIndexOf('/')) {
        // no file extension in the last path segment -> treat as a directory
        request.uri = uri + '/index.html';
    }
    return request;
}
""".strip()
            ),
        )

        # --- CloudFront distribution ------------------------------------------
        distribution = cloudfront.Distribution(
            self,
            "Cdn",
            comment="Shared hosting for small web apps (path-prefixed)",
            default_root_object="index.html",
            price_class=cloudfront.PriceClass.PRICE_CLASS_100,  # NA + EU, cheapest
            http_version=cloudfront.HttpVersion.HTTP2_AND_3,
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin.with_origin_access_control(bucket),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
                compress=True,
                function_associations=[
                    cloudfront.FunctionAssociation(
                        function=rewrite_fn,
                        event_type=cloudfront.FunctionEventType.VIEWER_REQUEST,
                    )
                ],
            ),
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_http_status=404,
                    response_page_path="/404.html",
                    ttl=Duration.minutes(5),
                ),
            ],
        )

        # --- apps/ip: the viewer's own address, from the edge --------------
        # The bucket never sees the viewer's address, so a pure-static answer
        # is impossible. This viewer-request function reads `event.viewer.ip`
        # and generates the response itself; the origin is never reached.
        # Caching is DISABLED because the response varies per viewer, and the
        # behaviour is separate from the default one so the index rewrite does
        # not turn /ip/whoami into /ip/whoami/index.html.
        #
        # This is the first app that needs this stack redeployed rather than
        # only an `s3 sync`. See docs/ip-data-research.md section 4.
        whoami_fn = cloudfront.Function(
            self,
            "IpWhoami",
            comment="apps/ip: return the viewer's IP (plaintext, or JSON for the page)",
            runtime=cloudfront.FunctionRuntime.JS_2_0,
            code=cloudfront.FunctionCode.from_file(
                file_path="edge/ip-whoami.js"
            ),
        )
        distribution.add_behavior(
            "/ip/whoami",
            origins.S3BucketOrigin.with_origin_access_control(bucket),
            viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
            compress=False,
            function_associations=[
                cloudfront.FunctionAssociation(
                    function=whoami_fn,
                    event_type=cloudfront.FunctionEventType.VIEWER_REQUEST,
                )
            ],
        )

        # --- Account-wide cost alarm ---------------------------------------------
        # Not scoped to this stack -- a runaway Tier 2 app (a Lambda in a loop,
        # a paid API called too often) should still trip this. Set the alert
        # email with:  cdk deploy -c alert_email=you@example.com
        alert_email = self.node.try_get_context("alert_email")
        if alert_email:
            budgets.CfnBudget(
                self,
                "MonthlyBudget",
                budget=budgets.CfnBudget.BudgetDataProperty(
                    budget_type="COST",
                    time_unit="MONTHLY",
                    budget_limit=budgets.CfnBudget.SpendProperty(
                        amount=10, unit="USD"
                    ),
                ),
                notifications_with_subscribers=[
                    budgets.CfnBudget.NotificationWithSubscribersProperty(
                        notification=budgets.CfnBudget.NotificationProperty(
                            notification_type="ACTUAL",
                            comparison_operator="GREATER_THAN",
                            threshold=80,
                            threshold_type="PERCENTAGE",
                        ),
                        subscribers=[
                            budgets.CfnBudget.SubscriberProperty(
                                subscription_type="EMAIL", address=alert_email
                            )
                        ],
                    ),
                    budgets.CfnBudget.NotificationWithSubscribersProperty(
                        notification=budgets.CfnBudget.NotificationProperty(
                            notification_type="FORECASTED",
                            comparison_operator="GREATER_THAN",
                            threshold=100,
                            threshold_type="PERCENTAGE",
                        ),
                        subscribers=[
                            budgets.CfnBudget.SubscriberProperty(
                                subscription_type="EMAIL", address=alert_email
                            )
                        ],
                    ),
                ],
            )

        # --- Outputs (the deployer reads these) --------------------------------
        CfnOutput(self, "BucketName", value=bucket.bucket_name)
        CfnOutput(self, "DistributionId", value=distribution.distribution_id)
        CfnOutput(
            self,
            "DistributionDomain",
            value=distribution.distribution_domain_name,
            description="Base URL host; apps live at https://<this>/<name>/",
        )
