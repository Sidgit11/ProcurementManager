import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { currentOrg } from "@/lib/auth/current";
import { buildGenieTools } from "@/lib/genie/tools";
import { GENIE_SYSTEM_V1 } from "@/lib/genie/system-prompt.v1";

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: UIMessage[] };
  const o = await currentOrg();

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: GENIE_SYSTEM_V1,
    messages: await convertToModelMessages(messages),
    tools: buildGenieTools(o.id),
    stopWhen: stepCountIs(6),
  });
  return result.toUIMessageStreamResponse();
}

export const runtime = "nodejs";
