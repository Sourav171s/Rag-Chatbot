import { testConnection, closePool } from './config';
import { embeddingService } from '../services/embedding.service';
import { vectorService } from '../services/vector.service';
import { documentRepository } from '../repositories/document.repository';
import { geminiConfig } from '../config/gemini.config';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from the backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface DocumentToSeed {
  content: string;
  metadata: {
    category: string;
    topic: string;
    source: string;
    filename: string;
  };
}

interface ChunkToSeed {
  content: string;
  title: string;
  metadata: Record<string, unknown>;
}

type StoredRow = Awaited<ReturnType<typeof documentRepository.findBySource>>[number];

/**
 * Read all markdown files from the docs directory
 */
function loadDocumentsFromMarkdown(): DocumentToSeed[] {
  const docsDir = path.resolve(__dirname, 'docs');
  const documents: DocumentToSeed[] = [];

  try {
    // Check if docs directory exists
    if (!fs.existsSync(docsDir)) {
      console.error(`❌ Docs directory not found at: ${docsDir}`);
      return documents;
    }

    // Read all files in the docs directory
    const files = fs.readdirSync(docsDir);
    // README.md describes this folder; it is not knowledge-base content
    const markdownFiles = files.filter(file => file.endsWith('.md') && file.toLowerCase() !== 'readme.md');

    console.log(`📚 Found ${markdownFiles.length} markdown file(s) in docs directory\n`);

    for (const file of markdownFiles) {
      const filePath = path.join(docsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract title from the first heading (if exists)
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : file.replace('.md', '');

      // Remove markdown heading syntax for cleaner topic name
      const topic = title.replace(/^#+\s*/, '');

      documents.push({
        content: content.trim(),
        metadata: {
          category: 'AI Documentation',
          topic,
          source: 'markdown',
          filename: file
        }
      });
    }

    return documents;
  } catch (error: unknown) {
    console.error(`❌ Error reading documents from markdown: ${error instanceof Error ? error.message : error}`);
    return documents;
  }
}

/**
 * Split a document the same way /api/chat/ingest does. Short files stay one
 * chunk; longer files get chunkIndex/totalChunks metadata.
 */
function toChunks(doc: DocumentToSeed): ChunkToSeed[] {
  const chunks = embeddingService.chunkText(doc.content);

  return chunks.map((content, chunkIndex) => ({
    content,
    title: doc.metadata.topic,
    metadata: chunks.length > 1
      ? { ...doc.metadata, chunkIndex, totalChunks: chunks.length, isChunked: true }
      : { ...doc.metadata },
  }));
}

const chunkIndexOf = (row: StoredRow): number => Number(row.metadata.chunkIndex ?? 0);

async function seedEmbeddings() {
  console.log('🌱 Starting database seeding with embeddings...\n');

  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.error('Failed to connect to database. Please check your configuration.');
    process.exit(1);
  }

  try {
    // Load documents from markdown files
    const documents = loadDocumentsFromMarkdown();

    if (documents.length === 0) {
      console.error('❌ No documents found to seed. Please add markdown files to the docs directory.');
      process.exit(1);
    }

    const embeddingModel = embeddingService.getEmbeddingModel();
    const embeddingDimension = embeddingService.getEmbeddingDimension();

    // The pgvector column dimension must match the configured embedding dimension
    const columnDimension = await documentRepository.getEmbeddingColumnDimension();
    if (columnDimension !== null && columnDimension !== embeddingDimension) {
      throw new Error(
        `documents.embedding is vector(${columnDimension}) but EMBEDDING_DIMENSION=${embeddingDimension}. ` +
        'Set EMBEDDING_DIMENSION to match, or add a migration that changes the column.'
      );
    }

    // Compare with what is already stored so each file is embedded only once.
    // A file is up to date when its stored chunks match the current chunks and
    // were embedded with the current model and dimension. Anything else (edited
    // files, duplicates, deleted files, rows from another embedding model such
    // as OpenAI) is replaced, so incompatible vectors are never mixed.
    const planned = documents.map(doc => ({ filename: doc.metadata.filename, chunks: toChunks(doc) }));
    const chunksByFilename = new Map(planned.map(file => [file.filename, file.chunks]));

    const rowsByFilename = new Map<string, StoredRow[]>();
    for (const row of await documentRepository.findBySource('markdown')) {
      const filename = String(row.metadata.filename ?? '');
      rowsByFilename.set(filename, [...(rowsByFilename.get(filename) ?? []), row]);
    }

    const upToDate = new Set<string>();
    const staleIds: string[] = [];

    for (const [filename, rows] of rowsByFilename) {
      const expected = chunksByFilename.get(filename);
      const sorted = [...rows].sort((a, b) => chunkIndexOf(a) - chunkIndexOf(b));
      const isCurrent =
        expected !== undefined &&
        sorted.length === expected.length &&
        sorted.every((row, i) =>
          row.metadata.embeddingModel === embeddingModel &&
          row.metadata.embeddingDimension === embeddingDimension &&
          row.content === expected[i].content
        );

      if (isCurrent) {
        upToDate.add(filename);
      } else {
        staleIds.push(...rows.map(row => row.id));
      }
    }

    const toEmbed = planned.filter(file => !upToDate.has(file.filename));
    const chunksToEmbed = toEmbed.flatMap(file => file.chunks);
    const totalChunks = planned.reduce((sum, file) => sum + file.chunks.length, 0);

    console.log(`   Embedding model: ${embeddingModel} (${embeddingDimension} dimensions)`);
    console.log(`   Files: ${documents.length} (${totalChunks} chunk(s)) | Already embedded: ${upToDate.size} file(s)`);
    console.log(`   To embed: ${toEmbed.length} file(s), ${chunksToEmbed.length} chunk(s) | Stale/duplicate rows to replace: ${staleIds.length}\n`);

    if (chunksToEmbed.length > 0) {
      // Batched: one request per `batchSize` chunks (instead of one request per chunk)
      const requests = Math.ceil(chunksToEmbed.length / geminiConfig.embedding.batchSize);
      console.log(`🔄 Generating ${chunksToEmbed.length} embedding(s) with Gemini in ${requests} batch request(s)...`);
      const embeddings = await embeddingService.generateEmbeddings(
        chunksToEmbed.map(chunk => ({ text: chunk.content, title: chunk.title }))
      );
      console.log(`   ✅ Received ${embeddings.length} vector(s) of ${embeddings[0].length} dimensions`);

      // Only remove old rows after the new embeddings were created successfully
      const removed = await documentRepository.deleteMany(staleIds);
      if (removed > 0) {
        console.log(`🧹 Removed ${removed} stale/duplicate seeded row(s)`);
      }

      for (let i = 0; i < chunksToEmbed.length; i++) {
        const chunk = chunksToEmbed[i];
        const result = await vectorService.addDocument(chunk.content, embeddings[i], chunk.metadata);
        const part = chunk.metadata.isChunked ? ` [chunk ${Number(chunk.metadata.chunkIndex) + 1}/${chunk.metadata.totalChunks}]` : '';
        console.log(`   ✅ Added ${chunk.metadata.filename}${part} (ID: ${result.id})`);
      }
    } else {
      const removed = await documentRepository.deleteMany(staleIds);
      if (removed > 0) {
        console.log(`🧹 Removed ${removed} stale/duplicate seeded row(s)`);
      }
      console.log('✅ All markdown documents are already embedded with this model. No Gemini calls made.');
    }

    // Verify that every planned chunk is stored with a vector from the current model
    const stored = (await documentRepository.findBySource('markdown'))
      .filter(row => row.metadata.embeddingModel === embeddingModel);
    if (stored.length !== totalChunks) {
      throw new Error(`Expected ${totalChunks} seeded chunk(s) embedded with ${embeddingModel}, found ${stored.length}`);
    }

    const finalStats = await vectorService.getStats();
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Seeding completed!');
    console.log(`   📊 Documents in database: ${finalStats.totalDocuments}`);
    console.log(`   🔎 Searchable with ${embeddingModel}: ${finalStats.searchableDocuments}`);
    const otherModels = finalStats.totalDocuments - finalStats.searchableDocuments;
    if (otherModels > 0) {
      console.log(`   ⚠️  ${otherModels} document(s) were embedded with another model and are excluded from search. Re-ingest them or reset the database.`);
    }
    console.log('='.repeat(60));
  } catch (error: unknown) {
    console.error('❌ Seeding failed:', error instanceof Error ? error.message : error);
    throw error;
  } finally {
    await closePool();
  }
}

if (require.main === module) {
  seedEmbeddings()
    .then(() => process.exit(0))
    .catch(() => {
      process.exit(1);
    });
}

export { seedEmbeddings };
