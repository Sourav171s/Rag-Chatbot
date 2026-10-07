import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { ApiError } from '../middleware/errorHandler';

// Load environment variables BEFORE reading them
// This ensures scripts that import this config get the env vars loaded
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Trimmed so a stray space or Windows line ending in .env.docker can't break a value
const env = (name: string): string | undefined => process.env[name]?.trim() || undefined;

const apiKey = env('GEMINI_API_KEY') ?? '';

if (!apiKey) {
  console.warn('⚠️  GEMINI_API_KEY not found in environment variables');
  console.warn('   AI features will not work until you add your API key (see .env.docker)');
}

// Thinking levels supported by gemini-3.8-flash ('minimal' returns an error).
// Gemini 3.x cannot turn thinking off; 'low' keeps latency and token usage down.
export type ThinkingLevel = 'low' | 'medium' | 'high';
const parseThinkingLevel = (value: string | undefined): ThinkingLevel => {
  return value === 'medium' || value === 'high' ? value : 'low';
};

// Gemini configuration
export const geminiConfig = {
  // Embedding model configuration (vector(1536) column in PostgreSQL)
  embedding: {
    model: env('GEMINI_EMBEDDING_MODEL') ?? 'gemini-embedding-2',
    dimensions: parseInt(env('EMBEDDING_DIMENSION') ?? '1536', 10),
    // Max inputs per batchEmbedContents request (each input gets its own vector)
    batchSize: 100,
  },

  // Chat model configuration (Interactions API)
  chat: {
    model: env('GEMINI_CHAT_MODEL') ?? 'gemini-3.8-flash',
    // Gemini counts thinking tokens as output, so leave headroom above the visible answer
    maxOutputTokens: parseInt(env('GEMINI_MAX_TOKENS') ?? '2048', 10),
    thinkingLevel: parseThinkingLevel(env('GEMINI_THINKING_LEVEL')),
  },

  // Bounded retries for transient errors (408 / 429 / 5xx). Never retries forever.
  request: {
    maxRetries: Math.max(0, parseInt(env('GEMINI_MAX_RETRIES') ?? '2', 10) || 0),
    timeoutMs: 60_000,
  },
};

// One official Google Gen AI SDK client for both chat (client.interactions)
// and embeddings (client.models.embedContent). It only runs in the backend.
export const geminiClient = new GoogleGenAI({
  apiKey: apiKey || 'missing-gemini-api-key',
  httpOptions: {
    timeout: geminiConfig.request.timeoutMs,
    // Used by client.models.* (embeddings). Chat passes the same limits per request.
    retryOptions: {
      attempts: geminiConfig.request.maxRetries + 1,
      initialDelay: 2,
      maxDelay: 10,
    },
  },
});

// Per-request options for client.interactions.create (its default is 4 retries).
// Each wait is capped at 10s like the embeddings client: Gemini's Retry-After
// for an exhausted daily quota can be hours, and waiting that long never helps.
export const geminiRequestOptions = {
  timeout: geminiConfig.request.timeoutMs,
  retries: {
    strategy: 'attempt-count-backoff' as const,
    maxRetries: geminiConfig.request.maxRetries,
    backoff: { initialInterval: 2_000, maxInterval: 10_000 },
    retryConnectionErrors: true,
  },
};

// Check if Gemini is properly configured
export const isGeminiConfigured = (): boolean => apiKey.length > 0;

/**
 * Turn an SDK error into a clear, secret-free message.
 * Gemini reports an invalid API key as HTTP 400 (not 401), so both are handled.
 */
export const describeGeminiError = (error: unknown, action: string): string => {
  const status = getErrorStatus(error);
  // Some Interactions API errors have a generic message and keep Google's
  // explanation only in the raw response body, so prefer that when present.
  const rawMessage = getGoogleMessage(error) ?? (error instanceof Error ? error.message : String(error));
  const detail = redactApiKey(rawMessage);

  if (/api key not valid|api_key_invalid/i.test(rawMessage) || status === 401) {
    return 'Invalid Gemini API key. Check GEMINI_API_KEY in .env.docker.';
  }
  if (status === 403) {
    return 'Gemini API access denied (403). Check that the key is enabled for the Gemini API.';
  }
  if (status === 404) {
    return `Gemini model not found (404). Check GEMINI_CHAT_MODEL / GEMINI_EMBEDDING_MODEL. Details: ${detail}`;
  }
  if (status === 429) {
    // Google's text says which limit was hit (per minute or per day) and when to retry
    return `Gemini rate limit or free-tier quota exceeded (429). Wait a minute (or until the daily quota resets) and try again. Details: ${detail.slice(0, 300)}`;
  }
  if (status !== undefined && status >= 500) {
    return `Gemini service error (${status}), usually temporary overload. Please try again later. Details: ${detail.slice(0, 300)}`;
  }
  // Network failures (DNS, refused connection, timeout) have no HTTP status;
  // fetch hides the reason in error.cause, so surface it.
  const cause = describeCause(error);
  if (status === undefined && cause) {
    return `Could not reach the Gemini API to ${action} (${redactApiKey(cause)}). Check the internet connection and try again.`;
  }
  return `Failed to ${action}: ${detail}`;
};

/**
 * Wrap a Gemini failure as an API error so clients get a meaningful status:
 * 429 (rate limit: wait), 503 (Gemini temporarily unavailable: retry later),
 * 502 (any other upstream failure, e.g. invalid key or model).
 */
export const geminiError = (error: unknown, action: string): ApiError => {
  const status = getErrorStatus(error);
  const statusCode = status === 429 ? 429 : status !== undefined && status >= 500 ? 503 : 502;
  return new ApiError(statusCode, describeGeminiError(error, action));
};

function getErrorStatus(error: unknown): number | undefined {
  return typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
    ? error.status
    : undefined;
}

// Google error bodies look like {"error": {"code": 400, "message": "...", ...}}
function getGoogleMessage(error: unknown): string | undefined {
  const body = typeof error === 'object' && error !== null && 'body' in error ? error.body : undefined;
  if (typeof body !== 'string') {
    return undefined;
  }
  const match = body.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  return match ? match[1].replace(/\\(.)/g, '$1') : undefined;
}

function describeCause(error: unknown): string {
  const cause = error instanceof Error ? error.cause : undefined;
  if (!(cause instanceof Error)) {
    return '';
  }
  const code = 'code' in cause && typeof cause.code === 'string' ? `${cause.code}: ` : '';
  return `${code}${cause.message}`;
}

function redactApiKey(text: string): string {
  const redacted = apiKey ? text.split(apiKey).join('[redacted]') : text;
  return redacted.replace(/AIza[0-9A-Za-z_-]{20,}/g, '[redacted]');
}
