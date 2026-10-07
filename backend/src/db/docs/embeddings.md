# Embeddings

Embeddings are dense vector representations of data that capture semantic meaning in a continuous space. They are fundamental to modern machine learning, particularly in natural language processing and recommendation systems.

## What Are Embeddings?

An embedding is a mapping from discrete objects (like words, sentences, or images) to vectors of real numbers. The key property is that similar items have similar vector representations.

For example, in a word embedding space:
- "happy" and "joyful" would be close together
- "cat" and "dog" would be relatively close (both animals)
- "cat" and "planet" would be far apart

## Types of Embeddings

### Word Embeddings
- **Word2Vec**: Predicts context words (Skip-gram) or target words (CBOW)
- **GloVe**: Based on global word co-occurrence statistics
- **FastText**: Handles out-of-vocabulary words using character n-grams

### Sentence and Document Embeddings
- **Sentence-BERT**: Fine-tunes BERT for sentence similarity
- **Universal Sentence Encoder**: General-purpose sentence embeddings
- **Doc2Vec**: Extension of Word2Vec for entire documents

### Contextual Embeddings
Unlike static embeddings, contextual embeddings vary based on context:
- **BERT embeddings**: Different representation for "bank" in "river bank" vs "money bank"
- **ELMo**: Early contextual embeddings using LSTMs
- **GPT embeddings**: From decoder-only transformers

## Creating Embeddings

Modern embedding models typically:
1. Process text through transformer layers
2. Pool or aggregate token representations
3. Project to fixed-size vector (commonly 384, 768, or 1536 dimensions)
4. Normalize to unit length for cosine similarity

## Embedding Models

Popular embedding models include:

- **OpenAI text-embedding-3-small**: 1536 dimensions, good balance
- **OpenAI text-embedding-3-large**: Higher quality, more expensive
- **Sentence Transformers**: Open-source, various sizes
- **Cohere Embed**: Multilingual support
- **Google's Vertex AI**: Enterprise-grade embeddings

## Similarity Metrics

To compare embeddings, various distance metrics are used:

- **Cosine Similarity**: Measures angle between vectors (most common)
- **Euclidean Distance**: Straight-line distance in vector space
- **Dot Product**: Useful for normalized vectors
- **Manhattan Distance**: Sum of absolute differences

## Applications

Embeddings power many AI applications:

- **Semantic Search**: Find documents by meaning, not just keywords
- **Clustering**: Group similar items together
- **Classification**: Use as features for downstream tasks
- **Anomaly Detection**: Identify outliers in embedding space
- **Recommendation**: Find similar items to recommend
- **Deduplication**: Identify duplicate or near-duplicate content

## Best Practices

When working with embeddings:

1. **Choose the Right Model**: Consider domain, language, and dimensionality
2. **Normalize Vectors**: For consistent similarity scores
3. **Batch Processing**: Generate embeddings efficiently
4. **Cache Results**: Embeddings are expensive to compute
5. **Fine-tune When Needed**: For domain-specific applications
6. **Monitor Quality**: Validate similarity matches make sense

## Limitations

Embeddings have some limitations:

- Lose some information in compression
- May reflect biases from training data
- Fixed-size representation regardless of input length
- Domain specificity (embeddings trained on one domain may not work well in another)

