import { vectorService } from './vector.service';
import { conversationRepository } from '../repositories/conversation.repository';
import { VectorSearchResult } from '../models/document.model';
import { embeddingService } from './embedding.service';
import { llmService, ChatMessage, TokenUsage } from './llm.service';
import { isGeminiConfigured } from '../config/gemini.config';

export interface RAGResponse {
  answer: string;
  sources: VectorSearchResult[];
  conversationId: string;
  usage: TokenUsage;
}

export class RAGService {
  /**
   * Process a user query using RAG pipeline
   *
   * Steps:
   * 1. Generate a Gemini embedding for the query
   * 2. Search for relevant documents using pgvector cosine similarity
   * 3. Build context from retrieved documents
   * 4. Generate the answer with Gemini, grounded in that context
   * 5. Save conversation history
   */
  async query(
    userMessage: string,
    conversationId?: string,
    options?: {
      maxSources?: number;
      similarityThreshold?: number;
      includeHistory?: boolean;
    }
  ): Promise<RAGResponse> {
    const maxSources = options?.maxSources || parseInt(process.env.MAX_SOURCES || '5', 10);
    const similarityThreshold = options?.similarityThreshold || parseFloat(process.env.SIMILARITY_THRESHOLD || '0.7');
    const includeHistory = options?.includeHistory ?? true;

    // Check if Gemini is configured
    if (!isGeminiConfigured()) {
      throw new Error('Gemini is not configured. Please add GEMINI_API_KEY to .env.docker.');
    }

    // Step 1: Create or get conversation
    let convId = conversationId;
    if (!convId) {
      const conversation = await conversationRepository.createConversation();
      convId = conversation.id;
    }

    // Save user message
    await conversationRepository.addMessage({
      conversation_id: convId,
      role: 'user',
      content: userMessage
    });

    // Step 2: Generate query embedding
    console.log('🔍 Generating embedding for query...');
    const queryEmbedding = await embeddingService.generateEmbedding(userMessage);

    // Step 3: Search for relevant documents using vector similarity
    console.log('📚 Searching for relevant documents...');
    const sources = await vectorService.search(
      queryEmbedding,
      maxSources,
      similarityThreshold
    );

    console.log(`✅ Found ${sources.length} relevant document(s)`);

    // Step 4: Get conversation history if needed
    let conversationHistory: ChatMessage[] = [];
    if (includeHistory) {
      const history = await conversationRepository.getMessages(convId);
      // Convert to chat messages (exclude the current user message we just added)
      conversationHistory = history
        .slice(0, -1) // Remove last message (current user message)
        .slice(-10) // Keep last 10 messages for context
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));
    }

    // Step 5: Generate response using LLM with retrieved context
    console.log('💭 Generating AI response...');
    const result = await llmService.generateChatCompletion(
      userMessage,
      sources,
      conversationHistory.length > 0 ? conversationHistory : undefined
    );

    // Step 6: Save assistant response
    await conversationRepository.addMessage({
      conversation_id: convId,
      role: 'assistant',
      content: result.content,
      sources: vectorService.formatSources(sources)
    });

    console.log('✅ Response generated successfully');

    return {
      answer: result.content,
      sources,
      conversationId: convId,
      usage: result.usage
    };
  }

  /**
   * Get conversation history
   */
  async getHistory(conversationId: string) {
    return await conversationRepository.getConversationWithMessages(conversationId);
  }

  /**
   * Ingest documents into the vector database
   * @param documents - Array of documents to ingest
   */
  async ingestDocuments(
    documents: Array<{
      content: string;
      metadata?: Record<string, unknown>;
    }>
  ) {
    if (!isGeminiConfigured()) {
      throw new Error('Gemini is not configured. Please add GEMINI_API_KEY to .env.docker.');
    }

    const results = [];

    console.log(`📝 Starting ingestion of ${documents.length} document(s)...`);

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];

      try {
        // Split long documents into chunks, then embed all chunks in one batch request
        const chunks = embeddingService.chunkText(doc.content);
        const title = typeof doc.metadata?.topic === 'string' ? doc.metadata.topic : undefined;
        console.log(`📄 Processing document ${i + 1}/${documents.length} (${chunks.length} chunk(s))...`);

        const embeddings = await embeddingService.generateEmbeddings(
          chunks.map(text => ({ text, title }))
        );

        if (chunks.length > 1) {
          for (let j = 0; j < chunks.length; j++) {
            const chunkMetadata = {
              ...doc.metadata,
              chunkIndex: j,
              totalChunks: chunks.length,
              isChunked: true
            };

            const result = await vectorService.addDocument(chunks[j], embeddings[j], chunkMetadata);
            results.push({
              status: 'success',
              documentIndex: i,
              chunkIndex: j,
              id: result.id
            });
          }
        } else {
          const result = await vectorService.addDocument(doc.content, embeddings[0], doc.metadata);

          results.push({
            status: 'success',
            documentIndex: i,
            id: result.id
          });
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error processing document ${i + 1}:`, message);
        results.push({
          status: 'error',
          documentIndex: i,
          error: message
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    console.log(`✅ Ingestion complete: ${successCount}/${results.length} successful`);

    return results;
  }

  /**
   * Ingest a single document with automatic chunking
   */
  async ingestDocument(
    content: string,
    metadata?: Record<string, unknown>
  ) {
    return this.ingestDocuments([{ content, metadata }]);
  }
}

export const ragService = new RAGService();