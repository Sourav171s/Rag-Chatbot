import { pool } from '../db/config';
import { Document, DocumentInput, VectorSearchResult } from '../models/document.model';

export class DocumentRepository {
  /**
   * Create a new document with optional embedding
   */
  async create(input: DocumentInput): Promise<Document> {
    const { content, embedding, metadata = {} } = input;

    const embeddingValue = embedding ? `[${embedding.join(',')}]` : null;

    const query = `
      INSERT INTO documents (content, embedding, metadata)
      VALUES ($1, $2, $3)
      RETURNING id, content, embedding, metadata, created_at, updated_at
    `;

    const values = [content, embeddingValue, JSON.stringify(metadata)];
    const result = await pool.query(query, values);

    return this.mapRowToDocument(result.rows[0]);
  }

  /**
   * Get document by ID
   */
  async findById(id: string): Promise<Document | null> {
    const query = 'SELECT * FROM documents WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToDocument(result.rows[0]);
  }

  /**
   * Get all documents
   */
  async findAll(limit = 100, offset = 0): Promise<Document[]> {
    const query = `
      SELECT * FROM documents
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);

    return result.rows.map(row => this.mapRowToDocument(row));
  }

  /**
   * Update document embedding
   */
  async updateEmbedding(id: string, embedding: number[]): Promise<Document> {
    const embeddingValue = `[${embedding.join(',')}]`;

    const query = `
      UPDATE documents
      SET embedding = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, content, embedding, metadata, created_at, updated_at
    `;

    const result = await pool.query(query, [embeddingValue, id]);

    if (result.rows.length === 0) {
      throw new Error(`Document with id ${id} not found`);
    }

    return this.mapRowToDocument(result.rows[0]);
  }

  /**
   * Perform vector similarity search using cosine distance.
   * Only vectors created by `embeddingModel` are compared, because vectors
   * from different embedding models live in different, incompatible spaces.
   */
  async vectorSearch(
    queryEmbedding: number[],
    embeddingModel: string,
    limit = 5,
    threshold = 0.7
  ): Promise<VectorSearchResult[]> {
    const embeddingValue = `[${queryEmbedding.join(',')}]`;

    // Get the closest documents first, then filter by threshold
    // This ensures we get results even if threshold is high
    const query = `
      SELECT
        id,
        content,
        metadata,
        1 - (embedding <=> $1::vector) as similarity
      FROM documents
      WHERE embedding IS NOT NULL
        AND metadata->>'embeddingModel' = $3
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `;

    const result = await pool.query(query, [embeddingValue, limit, embeddingModel]);

    // Filter by threshold after getting closest results
    return result.rows
      .filter(row => parseFloat(row.similarity) >= threshold)
      .map(row => ({
        id: row.id,
        content: row.content,
        metadata: row.metadata,
        similarity: parseFloat(row.similarity)
      }));
  }

  /**
   * Count documents whose vectors were created by the given embedding model
   */
  async countByEmbeddingModel(embeddingModel: string): Promise<number> {
    const query = `SELECT COUNT(*) FROM documents WHERE metadata->>'embeddingModel' = $1`;
    const result = await pool.query(query, [embeddingModel]);

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get documents by their metadata `source` (e.g. 'markdown' for seeded docs)
   */
  async findBySource(source: string): Promise<Array<Pick<Document, 'id' | 'content' | 'metadata'>>> {
    const query = `SELECT id, content, metadata FROM documents WHERE metadata->>'source' = $1`;
    const result = await pool.query(query, [source]);

    return result.rows.map(row => ({ id: row.id, content: row.content, metadata: row.metadata }));
  }

  /**
   * Delete several documents by ID
   */
  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const result = await pool.query('DELETE FROM documents WHERE id = ANY($1::uuid[])', [ids]);
    return result.rowCount ?? 0;
  }

  /**
   * Read the dimension of the documents.embedding vector column
   * (pgvector stores it as the column's type modifier)
   */
  async getEmbeddingColumnDimension(): Promise<number | null> {
    const query = `
      SELECT atttypmod
      FROM pg_attribute
      WHERE attrelid = 'documents'::regclass AND attname = 'embedding'
    `;
    const result = await pool.query(query);
    const dimension = result.rows[0]?.atttypmod;

    return typeof dimension === 'number' && dimension > 0 ? dimension : null;
  }

  /**
   * Delete document by ID
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM documents WHERE id = $1';
    const result = await pool.query(query, [id]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Count total documents
   */
  async count(): Promise<number> {
    const query = 'SELECT COUNT(*) FROM documents';
    const result = await pool.query(query);

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Helper method to map database row to Document model
   */
  private mapRowToDocument(row: any): Document {
    return {
      id: row.id,
      content: row.content,
      embedding: row.embedding ? this.parseVector(row.embedding) : null,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Parse pgvector format to number array
   */
  private parseVector(vectorString: string): number[] {
    // pgvector returns vectors as "[1,2,3]" string format
    return vectorString
      .replace('[', '')
      .replace(']', '')
      .split(',')
      .map(n => parseFloat(n));
  }
}

export const documentRepository = new DocumentRepository();