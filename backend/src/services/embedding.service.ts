import type { Content } from '@google/genai';
import {
  geminiClient,
  geminiConfig,
  isGeminiConfigured,
  geminiError,
} from '../config/gemini.config';

/**
 * Text to embed. Documents can carry a title, which gemini-embedding-2
 * uses as part of its retrieval-document format.
 */
export interface EmbeddingInput {
  text: string;
  title?: string;
}

export class EmbeddingService {
  /**
   * Generate the embedding for a user query (the search side of retrieval).
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const [embedding] = await this.embed([this.formatQuery(text)]);
    return embedding;
  }

  /**
   * Generate embeddings for documents in batch (the stored side of retrieval).
   * Sends one batchEmbedContents request per `batchSize` documents instead of
   * one request per document, and returns one vector per input, in order.
   */
  async generateEmbeddings(inputs: EmbeddingInput[]): Promise<number[][]> {
    if (inputs.length === 0) {
      return [];
    }

    const formatted = inputs.map(input => this.formatDocument(input));
    const embeddings: number[][] = [];
    const { batchSize } = geminiConfig.embedding;

    for (let i = 0; i < formatted.length; i += batchSize) {
      embeddings.push(...(await this.embed(formatted.slice(i, i + batchSize))));
    }

    return embeddings;
  }

  /**
   * Get the dimension of embeddings produced by the current model
   */
  getEmbeddingDimension(): number {
    return geminiConfig.embedding.dimensions;
  }

  /**
   * Get the embedding model name (stored with every vector)
   */
  getEmbeddingModel(): string {
    return geminiConfig.embedding.model;
  }

  /**
   * gemini-embedding-2 does not support task_type; Google's docs say to put the
   * retrieval task into the text instead (query vs. document formats).
   */
  private formatQuery(text: string): string {
    return `task: search result | query: ${text}`;
  }

  private formatDocument({ text, title }: EmbeddingInput): string {
    return `title: ${title?.trim() || 'none'} | text: ${text}`;
  }

  /**
   * Call Gemini once for a batch of texts and validate the vectors.
   */
  private async embed(texts: string[]): Promise<number[][]> {
    if (!isGeminiConfigured()) {
      throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in .env.docker.');
    }

    // One Content per text. gemini-embedding-2 is multimodal: a plain string[]
    // is treated as the parts of ONE input and returns ONE aggregated embedding.
    // Separate Content objects return one embedding each.
    const contents: Content[] = texts.map(text => ({ role: 'user', parts: [{ text }] }));
    const expectedDimension = geminiConfig.embedding.dimensions;

    let vectors: Array<number[] | undefined>;
    try {
      // gemini-embedding-2 returns unit-length vectors at any outputDimensionality,
      // so no manual normalization is needed for cosine similarity
      const response = await geminiClient.models.embedContent({
        model: geminiConfig.embedding.model,
        contents,
        config: { outputDimensionality: expectedDimension },
      });
      vectors = (response.embeddings ?? []).map(embedding => embedding.values);
    } catch (error: unknown) {
      const apiError = geminiError(error, 'generate embeddings');
      console.error(`Error generating embeddings: ${apiError.message}`);
      throw apiError;
    }

    if (vectors.length !== texts.length) {
      throw new Error(`Gemini returned ${vectors.length} embedding(s) for ${texts.length} input(s)`);
    }

    return vectors.map(vector => {
      if (!vector || vector.length !== expectedDimension) {
        throw new Error(
          `Embedding has ${vector?.length ?? 0} dimensions, expected ${expectedDimension} (EMBEDDING_DIMENSION)`
        );
      }
      if (!vector.every(Number.isFinite)) {
        throw new Error('Embedding contains non-numeric values');
      }
      return vector;
    });
  }

  /**
   * Chunk text into smaller pieces for embedding
   * Useful for long documents that exceed token limits
   * (8000 characters stays well below gemini-embedding-2's 8192-token input limit)
   */
  chunkText(text: string, maxChunkSize = 8000): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split('\n\n');

    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        // If a single paragraph is too long, split by sentences
        if (paragraph.length > maxChunkSize) {
          const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
          for (const sentence of sentences) {
            if ((currentChunk + sentence).length > maxChunkSize) {
              if (currentChunk) {
                chunks.push(currentChunk.trim());
              }
              currentChunk = sentence;
            } else {
              currentChunk += sentence;
            }
          }
        } else {
          currentChunk = paragraph;
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

export const embeddingService = new EmbeddingService();