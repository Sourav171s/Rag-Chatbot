export interface Conversation {
  id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: DocumentSource[];
  created_at: Date;
}

export interface DocumentSource {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export interface MessageInput {
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: DocumentSource[];
}