import os
import sys

# Prefer the vendored SDK (scripts/build_lambda.*) over the older boto3 baked
# into the Lambda runtime -- the `bedrock-agentcore` client needs boto3
# >= 1.39.8. If _vendor/ is absent this is a harmless no-op and we fall back
# to the runtime's boto3.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "_vendor"))

import json
import uuid
from datetime import datetime, timezone

import boto3

dynamodb = boto3.resource("dynamodb")
ssm = boto3.client("ssm")
agentcore = boto3.client("bedrock-agentcore")

STORIES_TABLE_NAME = os.environ["STORIES_TABLE_NAME"]
APP_SECRET_PARAM = os.environ["APP_SECRET_PARAM"]
AGENT_RUNTIME_ARN = os.environ["AGENT_RUNTIME_ARN"]

table = dynamodb.Table(STORIES_TABLE_NAME)

# Cached across warm invocations so we're not calling SSM on every request.
_secret_cache = {}


def handler(event, context):
    try:
        headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
        if headers.get("x-app-secret") != _get_secret(APP_SECRET_PARAM):
            return _response(401, {"error": "unauthorized"})

        body = json.loads(event.get("body") or "{}")
        story_id = body.get("story_id")
        action = body.get("action", "")

        if not story_id:
            return _response(400, {"error": "story_id is required"})

        item = table.get_item(Key={"story_id": story_id}).get("Item")
        prior_history = item["history"] if item else ""

        # Send the prior history and the new action as separate fields so the
        # agent can put a prompt-cache boundary between them -- the history is
        # append-only, so all but the last turn is re-read from cache.
        continuation = _generate(story_id, prior_history, action)

        history = prior_history
        if action:
            history += f"\n\n> {action}\n"
        history += continuation

        now = datetime.now(timezone.utc).isoformat()
        table.put_item(
            Item={
                "story_id": story_id,
                "history": history,
                "updated_at": now,
                "created_at": item["created_at"] if item else now,
            }
        )

        return _response(200, {"continuation": continuation, "history": history})

    except Exception as e:  # noqa: BLE001 -- want to always return valid JSON
        print(f"ERROR: {e}")
        return _response(500, {"error": "internal error"})


def _generate(story_id: str, prior_history: str, action: str) -> str:
    """Hand the story so far to the AgentCore orchestrator and return its
    continuation. The agent decides on its own whether to roll for danger."""
    payload = json.dumps(
        {"history": prior_history, "action": action}
    ).encode("utf-8")

    # One runtime session per story keeps a warm micro-VM per reader. The id
    # must be >= 33 chars; a "story-" prefix + uuid5 of the story id is stable
    # across turns and always long enough.
    session_id = f"story-{uuid.uuid5(uuid.NAMESPACE_URL, story_id)}"

    resp = agentcore.invoke_agent_runtime(
        agentRuntimeArn=AGENT_RUNTIME_ARN,
        runtimeSessionId=session_id,
        qualifier="DEFAULT",
        payload=payload,
    )

    raw = _read_runtime_response(resp.get("response"))

    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return raw.strip()

    if isinstance(data, dict):
        return (data.get("continuation") or data.get("result") or raw).strip()
    if isinstance(data, str):
        return data.strip()
    return raw.strip()


def _read_runtime_response(response) -> str:
    """invoke_agent_runtime returns either a streaming body or an iterable of
    byte chunks depending on the runtime's content type -- handle both."""
    if response is None:
        return ""
    if hasattr(response, "read"):
        return response.read().decode("utf-8")
    parts = []
    for chunk in response:
        if isinstance(chunk, (bytes, bytearray)):
            parts.append(chunk.decode("utf-8"))
        else:
            parts.append(str(chunk))
    return "".join(parts)


def _get_secret(param_name: str) -> str:
    if param_name not in _secret_cache:
        resp = ssm.get_parameter(Name=param_name, WithDecryption=True)
        _secret_cache[param_name] = resp["Parameter"]["Value"]
    return _secret_cache[param_name]


def _response(status_code: int, body: dict):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }
