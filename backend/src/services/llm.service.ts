import type { Interactions } from '@google/genai';
import {
  geminiClient,
  geminiConfig,
  geminiRequestOptions,
  isGeminiConfigured,
  geminiError,
} from '../config/gemini.config';
import { ApiError } from '../middleware/errorHandler';
import { VectorSearchResult } from '../models/document.model';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatCompletionResult {
  content: string;
  usage: TokenUsage;
}

export interface ChatCompletionOptions {
  maxTokens?: number;
  systemPrompt?: string;
}

export class LLMService {
  /**
   * Generate a chat completion with optional RAG context
   */
  async generateChatCompletion(
    userMessage: string,
    context?: VectorSearchResult[],
    conversationHistory?: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionResult> {
    this.assertConfigured();

    const systemPrompt = options?.systemPrompt || this.buildSystemPrompt(context);
    const input = this.buildInput(userMessage, conversationHistory);

    return this.createInteraction(
      systemPrompt,
      input,
      options?.maxTokens ?? geminiConfig.chat.maxOutputTokens,
      'generate response'
    );
  }

  /**
   * Build system prompt with RAG context
   */
  private buildSystemPrompt(context?: VectorSearchResult[]): string {
    let systemPrompt = `You are a helpful AI customer service assistant. You provide accurate, relevant, and concise answers based on the information available to you.`;

    if (context && context.length > 0) {
      systemPrompt += `\n\nUse the following context to answer the user's question. If the context doesn't contain relevant information, please alert the user clearly that it is from your general knowledge.\n\n`;
      systemPrompt += `CONTEXT:\n`;
      systemPrompt += `---\n`;

      context.forEach((doc, index) => {
        systemPrompt += `[Source ${index + 1}] (Relevance: ${(doc.similarity * 100).toFixed(1)}%)\n`;
        systemPrompt += `${doc.content}\n\n`;
        if (index < context.length - 1) {
          systemPrompt += `---\n`;
        }
      });

      systemPrompt += `\nWhen using information from the context, try to reference which source it came from (e.g., "According to Source 1...").`;
    }

    return systemPrompt;
  }

  /**
   * Convert the stored conversation plus the new message into Interactions API
   * steps: user turns are `user_input`, assistant turns are `model_output`.
   */
  private buildInput(userMessage: string, conversationHistory: ChatMessage[] = []): Interactions.Step[] {
    const messages: ChatMessage[] = [...conversationHistory, { role: 'user', content: userMessage }];

    return messages.map((message): Interactions.Step => {
      const content: Interactions.TextContent[] = [{ type: 'text', text: message.content }];
      return message.role === 'assistant'
        ? { type: 'model_output', content }
        : { type: 'user_input', content };
    });
  }

  /**
   * Request parameters shared by streaming and non-streaming calls.
   * `store: false` keeps the call stateless: the history lives in PostgreSQL
   * and is sent with every request, so Google does not need to store it.
   */
  private interactionParams(systemInstruction: string, input: Interactions.Step[] | string, maxOutputTokens: number) {
    return {
      model: geminiConfig.chat.model,
      system_instruction: systemInstruction,
      input,
      store: false,
      generation_config: {
        max_output_tokens: maxOutputTokens,
        thinking_level: geminiConfig.chat.thinkingLevel,
      },
    };
  }

  /**
   * Call the Gemini Interactions API once and map the result to our response shape.
   */
  private async createInteraction(
    systemInstruction: string,
    input: Interactions.Step[] | string,
    maxOutputTokens: number,
    action: string
  ): Promise<ChatCompletionResult> {
    let interaction: Interactions.Interaction;
    try {
      interaction = await geminiClient.interactions.create(
        this.interactionParams(systemInstruction, input, maxOutputTokens),
        geminiRequestOptions
      );
    } catch (error: unknown) {
      const apiError = geminiError(error, action);
      console.error(`Error calling Gemini (${action}): ${apiError.message}`);
      throw apiError;
    }

    // output_text is the SDK's concatenation of the model's text output
    const content = interaction.output_text?.trim() ?? '';
    if (!content) {
      throw new ApiError(
        502,
        interaction.status === 'incomplete'
          ? 'Gemini used the whole output budget before answering. Increase GEMINI_MAX_TOKENS.'
          : `No response generated from Gemini (status: ${interaction.status})`
      );
    }
    if (interaction.status !== 'completed') {
      console.warn(`⚠️  Gemini interaction finished with status "${interaction.status}"; the answer may be truncated.`);
    }

    return { content, usage: this.toTokenUsage(interaction.usage) };
  }

  /**
   * Gemini bills thinking tokens as output, so they count as completion tokens.
   */
  private toTokenUsage(usage: Interactions.Usage | undefined): TokenUsage {
    const promptTokens = usage?.total_input_tokens ?? 0;
    const completionTokens = (usage?.total_output_tokens ?? 0) + (usage?.total_thought_tokens ?? 0);

    return {
      promptTokens,
      completionTokens,
      totalTokens: usage?.total_tokens ?? promptTokens + completionTokens,
    };
  }

  private assertConfigured(): void {
    if (!isGeminiConfigured()) {
      throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in .env.docker.');
    }
  }

  /**
   * Generate a streaming chat completion
   * Note: This is a placeholder for streaming support
   */
  async *generateChatCompletionStream(
    userMessage: string,
    context?: VectorSearchResult[],
    conversationHistory?: ChatMessage[],
    options?: ChatCompletionOptions
  ): AsyncGenerator<string, void, unknown> {
    this.assertConfigured();

    const systemPrompt = options?.systemPrompt || this.buildSystemPrompt(context);
    const input = this.buildInput(userMessage, conversationHistory);
    const maxOutputTokens = options?.maxTokens ?? geminiConfig.chat.maxOutputTokens;

    try {
      const stream = await geminiClient.interactions.create(
        { ...this.interactionParams(systemPrompt, input, maxOutputTokens), stream: true },
        geminiRequestOptions
      );

      for await (const event of stream) {
        if (event.event_type === 'error') {
          throw new Error(event.error?.message ?? 'Gemini stream error');
        }
        // Only text deltas of the answer; thought summaries use a different delta type
        if (event.event_type === 'step.delta' && event.delta.type === 'text') {
          yield event.delta.text;
        }
      }
    } catch (error: unknown) {
      const apiError = geminiError(error, 'generate streaming response');
      console.error(`Error generating streaming chat completion: ${apiError.message}`);
      throw apiError;
    }
  }

  /**
   * Summarize a long text
   */
  async summarize(text: string, maxLength = 200): Promise<string> {
    this.assertConfigured();

    const result = await this.createInteraction(
      'You are a helpful assistant that summarizes text concisely.',
      `Summarize the following text in ${maxLength} words or less:\n\n${text}`,
      // Words -> tokens overhead, plus headroom for Gemini's thinking tokens
      Math.ceil(maxLength * 1.5) + 1024,
      'summarize text'
    );

    return result.content;
  }
}

export const llmService = new LLMService();
