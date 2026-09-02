import aws_cdk as cdk
from aws_cdk import (
    Stack,
    RemovalPolicy,
    Duration,
    CfnOutput,
    aws_dynamodb as dynamodb,
    aws_lambda as _lambda,
    aws_iam as iam,
    aws_budgets as budgets,
)
from constructs import Construct

# TODO: replace with your real email before running `cdk deploy`.
# Used only for the two budget-alert notifications below.
ALERT_EMAIL = "alerts@example.com"


class StoryAppStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # The orchestrator Lambda calls a separate Amazon Bedrock AgentCore
        # Runtime service (see agent/) to generate each turn. Deploy that
        # first, then pass its ARN in:
        #   cdk deploy -c agent_runtime_arn=arn:aws:bedrock-agentcore:...:runtime/...
        agent_runtime_arn = self.node.try_get_context("agent_runtime_arn")
        if not agent_runtime_arn:
            raise ValueError(
                "Missing required CDK context 'agent_runtime_arn'. Deploy the "
                "AgentCore runtime first (see agent/README.md), then run:\n"
                "  cdk deploy -c agent_runtime_arn=<runtime-arn>\n"
                "or add it under \"context\" in cdk.json."
            )

        # --- Data store -----------------------------------------------
        # Pay-per-request billing means $0 when nobody's writing.
        # RemovalPolicy.DESTROY makes `cdk destroy` also wipe story data,
        # which is convenient while iterating but should become RETAIN
        # once this holds anything you'd be upset to lose.
        stories_table = dynamodb.Table(
            self,
            "StoriesTable",
            table_name="story-app-stories",
            partition_key=dynamodb.Attribute(
                name="story_id", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        # --- Orchestrator Lambda ----------------------------------------
        orchestrator_fn = _lambda.Function(
            self,
            "OrchestratorFunction",
            function_name="story-app-orchestrator",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=_lambda.Code.from_asset("lambda/orchestrator"),
            # A turn is now a full agent loop (model -> roll_for_danger ->
            # model) over the network, so give it more headroom than the old
            # single OpenRouter call needed.
            timeout=Duration.seconds(60),
            memory_size=512,
            environment={
                "STORIES_TABLE_NAME": stories_table.table_name,
                "APP_SECRET_PARAM": "/story-app/app-secret",
                "AGENT_RUNTIME_ARN": agent_runtime_arn,
            },
        )

        stories_table.grant_read_write_data(orchestrator_fn)

        # Let the Lambda invoke the AgentCore Runtime service.
        orchestrator_fn.add_to_role_policy(
            iam.PolicyStatement(
                actions=["bedrock-agentcore:InvokeAgentRuntime"],
                resources=[agent_runtime_arn, f"{agent_runtime_arn}/*"],
            )
        )

        # Least-privilege read access to just this app's SSM parameters,
        # not every parameter in the account.
        orchestrator_fn.add_to_role_policy(
            iam.PolicyStatement(
                actions=["ssm:GetParameter"],
                resources=[
                    f"arn:aws:ssm:{self.region}:{self.account}:parameter/story-app/*"
                ],
            )
        )

        # --- Public entry point ------------------------------------------
        # AuthType.NONE means anyone with the URL can call this. The
        # handler checks an x-app-secret header as a lightweight gate for
        # now -- fine for solo dev/testing, but swap this for Cognito or
        # API Gateway + an authorizer before real users touch it.
        fn_url = orchestrator_fn.add_function_url(
            auth_type=_lambda.FunctionUrlAuthType.NONE,
            cors=_lambda.FunctionUrlCorsOptions(
                allowed_origins=["*"],
                allowed_methods=[_lambda.HttpMethod.POST],
                allowed_headers=["content-type", "x-app-secret"],
            ),
        )

        CfnOutput(self, "FunctionUrl", value=fn_url.url)
        CfnOutput(self, "StoriesTableName", value=stories_table.table_name)
        CfnOutput(self, "AgentRuntimeArn", value=agent_runtime_arn)

        # --- Budget guardrail --------------------------------------------
        # Emails you at 50% and 100% of a $10/month spend threshold across
        # the whole account. This is an account-wide budget, not scoped to
        # just this app -- if you're running other things in this account,
        # keep that in mind.
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
                        threshold=threshold,
                        threshold_type="PERCENTAGE",
                    ),
                    subscribers=[
                        budgets.CfnBudget.SubscriberProperty(
                            subscription_type="EMAIL",
                            address=ALERT_EMAIL,
                        )
                    ],
                )
                for threshold in (50, 100)
            ],
        )
