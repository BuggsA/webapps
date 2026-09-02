# reference

Torn-down code from the `story-app` project, kept only as the **Tier 2
template**. Nothing here is deployed or imported by the hosting stack.

A builder that genuinely needs Tier 2 (a network probe a browser can't
make; a paid API whose secret can't ship in client code) copies the
skeleton from here.

## `orchestrator_handler.py`

A Lambda behind a Function URL. Keep:
- the auth-header check
- JSON request parsing / JSON responses / CORS headers
- fetching a secret from SSM Parameter Store at cold start

Ignore: the DynamoDB reads/writes and the Bedrock agent-invoke calls --
those were story-app specific.

## `story_stack.py`

CDK for a single Function URL Lambda with least-privilege IAM and a
per-stack budget alarm. Good shape for the "one small function" case:
`Code.from_asset`, Python 3.12 runtime, CORS on the Function URL,
scoped IAM. Strip it down to what the specific app needs.

## `orchestrator_requirements.txt`

The Lambda's Python deps as they were. Prune to what a given Tier 2 app
actually uses.
