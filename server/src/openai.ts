import { OpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import db from "./data";
import { decryptFromDb } from "./data/schema";
import { exponentialRetry } from "./utils";

export class BadToolCallResponseError extends Error {}

export async function findOpenAiApiKey() {
  const apiKey = await db.query.settings.findFirst({
    where: (settings, { eq }) => eq(settings.key, "OPENAI_API_KEY"),
  });
  if (!apiKey) {
    throw new Error("OpenAI API Key not found");
  }
  const decrypted = decryptFromDb(apiKey.value);
  return decrypted;
}

export async function getOpenAi() {
  const apiKey = await findOpenAiApiKey();
  return new OpenAI({ apiKey });
}

export type ToolCallParameters = Record<string, unknown>;

export type ToolCallReturn<T extends ToolCallParameters> = {
  [key in keyof T]: unknown;
};

async function simpleToolCompletionImpl<T extends ToolCallParameters>(
  messages: Array<ChatCompletionMessageParam>,
  toolName: string,
  parameters: T,
  requiredParameters?: Array<keyof T>
): Promise<ToolCallReturn<T> | null> {
  const openai = await getOpenAi();
  const chatCompletion = await openai.chat.completions.create({
    messages,
    model: "gpt-4o",
    tools: [
      {
        type: "function",
        function: {
          name: toolName,
          parameters: {
            type: "object",
            properties: parameters,
            required: requiredParameters || undefined,
          },
        },
      },
    ],
    tool_choice: {
      type: "function",
      function: {
        name: toolName,
      },
    },
  });
  if (!chatCompletion.choices[0].message.tool_calls?.length) {
    return null;
  }
  const toolArgs = JSON.parse(
    chatCompletion.choices[0].message.tool_calls[0].function.arguments
  );
  return toolArgs;
}

export function simpleToolCompletion<T extends ToolCallParameters>(
  messages: Array<ChatCompletionMessageParam>,
  toolName: string,
  parameters: T,
  requiredParameters?: Array<keyof T>
): Promise<ToolCallReturn<T> | null> {
  return exponentialRetry(
    () =>
      simpleToolCompletionImpl(
        messages,
        toolName,
        parameters,
        requiredParameters
      ),
    10
  );
}

export function assertBool(obj: Record<string, unknown>, key: string) {
  const value = obj[key];
  if (typeof value == "string") {
    if (["yes", "true"].includes(value.toLowerCase())) {
      return true;
    }
    if (["no", "false", "null"].includes(value.toLowerCase())) {
      return false;
    }
    throw new BadToolCallResponseError(
      `Bad tool response value for ${key}. ${JSON.stringify(obj)}`
    );
  }
  if (typeof value == "boolean") {
    return value;
  }
  throw new BadToolCallResponseError(
    `Bad tool response value for ${key}. ${JSON.stringify(obj)}`
  );
}

export function assertString(obj: Record<string, unknown>, key: string) {
  const value = obj[key];
  if (typeof value !== "string") {
    throw new BadToolCallResponseError(
      `Bad tool response value for ${key}. ${JSON.stringify(obj)}`
    );
  }
  return value;
}

export function assertStringEnum(
  obj: Record<string, unknown>,
  key: string,
  values: string[]
) {
  const value = assertString(obj, key);
  if (!values.includes(value)) {
    throw new BadToolCallResponseError(
      `Bad tool response value for ${key}. ${JSON.stringify(obj)}`
    );
  }
  return value;
}

export function assertNumber(
  obj: Record<string, unknown>,
  key: string
): number {
  const value = obj[key];
  if (typeof value === "string") {
    if (!value.match(/^\d+$/)) {
      throw new BadToolCallResponseError(
        `Bad tool response value for ${key}. ${JSON.stringify(obj)}`
      );
    }
    return parseInt(value, 10);
  }
  if (typeof value !== "number") {
    throw new BadToolCallResponseError(
      `Bad tool response value for ${key}. ${JSON.stringify(obj)}`
    );
  }
  return value;
}

export function assertArray<T>(obj: Record<string, unknown>, key: string): T[] {
  const value = obj[key];
  if (Array.isArray(value)) {
    return value as T[];
  }
  throw new BadToolCallResponseError(
    `Bad tool response value for ${key}. ${JSON.stringify(obj)}`
  );
}
