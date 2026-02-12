import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { createParser } from 'eventsource-parser';
import { createGateway } from 'ai';
import { AIChatMessage, AIProvider, LOCAL_TOOL_BY_PROVIDER, isLocalAIProvider } from './ai-config';

export const MAX_API_KEY_LENGTH = 512;
export const MAX_CHAT_MESSAGES = 24;
export const MAX_CHAT_MESSAGE_LENGTH = 10_000;
export const MAX_SYSTEM_PROMPT_LENGTH = 8_000;
export const MAX_GOOGLE_MODELS = 300;

export const DEFAULT_SYSTEM_PROMPT =
  'You are an AI reading assistant helping users understand saved web articles and notes.';

export const TEXT_STREAM_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  'X-Accel-Buffering': 'no',
} as const;

export const normalizeText = (value: unknown, maxLength: number) =>
  String(value ?? '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLength);

export const normalizeApiKey = (value: unknown) =>
  typeof value === 'string' ? value.trim().slice(0, MAX_API_KEY_LENGTH) : '';

export const normalizeChatMessages = (payload: unknown): AIChatMessage[] => {
  if (!Array.isArray(payload)) return [];

  return payload
    .map((message) => {
      if (typeof message !== 'object' || message === null) return null;
      const record = message as { role?: unknown; content?: unknown };
      if (record.role !== 'user' && record.role !== 'assistant') return null;

      const content = normalizeText(record.content, MAX_CHAT_MESSAGE_LENGTH);
      if (!content) return null;

      return {
        role: record.role,
        content,
      } as AIChatMessage;
    })
    .filter((message): message is AIChatMessage => Boolean(message))
    .slice(-MAX_CHAT_MESSAGES);
};

export const toSDKMessages = (messages: AIChatMessage[]) =>
  messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

export const parseResponseError = async (response: Response) => {
  const raw = await response.text().catch(() => '');
  if (!raw) return `Provider returned ${response.status}`;
  return `Provider returned ${response.status}: ${raw.slice(0, 400)}`;
};

const uniqueModelIds = (ids: string[]) =>
  Array.from(new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0)));

const filterOpenAIChatModels = (ids: string[]) => {
  const filtered = ids.filter((id) => {
    const lower = id.toLowerCase();
    const looksLikeChat =
      lower.includes('gpt') ||
      lower.startsWith('o1') ||
      lower.startsWith('o3') ||
      lower.startsWith('o4');
    const notChat =
      lower.includes('embedding') ||
      lower.includes('whisper') ||
      lower.includes('tts') ||
      lower.includes('transcribe') ||
      lower.includes('moderation') ||
      lower.includes('image') ||
      lower.includes('audio');

    return looksLikeChat && !notChat;
  });

  return filtered.length > 0 ? filtered : ids;
};

export const createLanguageModel = (provider: AIProvider, model: string, apiKey: string) => {
  if (provider === 'gateway') {
    const gatewayApiKey = apiKey || process.env.AI_GATEWAY_API_KEY || undefined;
    const gatewayProvider = gatewayApiKey
      ? createGateway({ apiKey: gatewayApiKey })
      : createGateway();
    return gatewayProvider(model);
  }

  if (provider === 'openai') {
    return createOpenAI({ apiKey })(model);
  }

  if (provider === 'anthropic') {
    return createAnthropic({ apiKey })(model);
  }

  return createGoogleGenerativeAI({ apiKey })(model);
};

export const createLocalBridgeTextStream = async ({
  localProvider,
  model,
  messages,
  systemPrompt,
}: {
  localProvider: keyof typeof LOCAL_TOOL_BY_PROVIDER;
  model: string;
  messages: AIChatMessage[];
  systemPrompt: string;
}) => {
  const bridgeBase = (process.env.CLI_BRIDGE_URL || 'http://127.0.0.1:3456').replace(/\/$/, '');
  const cliModel = model.endsWith('-local') ? '' : model;

  const response = await fetch(`${bridgeBase}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tool: LOCAL_TOOL_BY_PROVIDER[localProvider],
      model: cliModel || undefined,
      messages,
      systemPrompt,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await parseResponseError(response));
  }

  if (!response.body) {
    return new ReadableStream<Uint8Array>();
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let streamError: Error | null = null;

      const parser = createParser({
        onEvent: (event) => {
          if (event.data === '[DONE]') return;

          try {
            const payload = JSON.parse(event.data) as { text?: string; error?: string };
            if (payload.error) {
              streamError = new Error(payload.error);
              return;
            }

            if (payload.text) {
              controller.enqueue(encoder.encode(payload.text));
            }
          } catch {
            // Ignore malformed local chunks.
          }
        },
      });

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          parser.feed(decoder.decode(value, { stream: true }));
          if (streamError) throw streamError;
        }
      } catch (error) {
        controller.error(
          error instanceof Error ? error : new Error('Failed to parse local stream')
        );
        return;
      }

      if (streamError) {
        controller.error(streamError);
        return;
      }

      controller.close();
    },
    cancel: async () => {
      await reader.cancel();
    },
  });
};

export const listLiveModels = async (provider: AIProvider, apiKey: string): Promise<string[]> => {
  if (provider === 'gateway') {
    const gatewayApiKey = apiKey || process.env.AI_GATEWAY_API_KEY || undefined;
    const gatewayProvider = gatewayApiKey
      ? createGateway({ apiKey: gatewayApiKey })
      : createGateway();
    const metadata = await gatewayProvider.getAvailableModels();

    const languageModels = Array.isArray(metadata.models)
      ? metadata.models.filter((entry) => !entry.modelType || entry.modelType === 'language')
      : [];

    return uniqueModelIds(languageModels.map((entry) => entry.id));
  }

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey });
    const ids: string[] = [];

    for await (const model of client.models.list()) {
      ids.push(model.id);
    }

    return filterOpenAIChatModels(uniqueModelIds(ids));
  }

  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey });
    const ids: string[] = [];

    for await (const model of client.models.list()) {
      ids.push(model.id);
    }

    return uniqueModelIds(ids).filter((id) => id.toLowerCase().includes('claude'));
  }

  const client = new GoogleGenAI({ apiKey });
  const pager = await client.models.list({ config: { pageSize: 100 } });
  const ids: string[] = [];

  for await (const model of pager) {
    const name = typeof model.name === 'string' ? model.name.replace(/^models\//, '').trim() : '';
    const supportedActions = Array.isArray(model.supportedActions) ? model.supportedActions : [];
    const isGenerationModel =
      supportedActions.length === 0 || supportedActions.includes('generateContent');

    if (name && isGenerationModel && name.toLowerCase().includes('gemini')) {
      ids.push(name);
    }

    if (ids.length >= MAX_GOOGLE_MODELS) {
      break;
    }
  }

  return uniqueModelIds(ids);
};

export const requiresApiKey = (provider: AIProvider) =>
  !isLocalAIProvider(provider) && provider !== 'gateway';
