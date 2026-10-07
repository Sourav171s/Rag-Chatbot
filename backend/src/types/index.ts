// Request types
export interface ChatRequest {
  message: string;
  conversationId?: string;
}

// Response types
export interface ChatResponse {
  success: boolean;
  data: {
    message: string;
    conversationId: string;
    timestamp: string;
    sources?: DocumentSource[];
  };
}

export interface DocumentSource {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
}

// Conversation types
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}