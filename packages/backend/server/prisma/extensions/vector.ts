import { Prisma } from '@prisma/client';

// Extend Prisma with vector operations
export const PrismaVectorExtension = Prisma.defineExtension((client) => {
  return client.({
    model: {
      documentEmbedding: {
        async findSimilar(
          embedding: number[], 
          limit: number = 5, 
          threshold: number = 0.8
        ) {
          const result = await client.`
            SELECT de.doc_id, de.chunk_index, de.content, 
                   1 - (de.embedding <=> ${embedding}::vector) as similarity
            FROM document_embeddings de
            WHERE 1 - (de.embedding <=> ${embedding}::vector) > ${threshold}
            ORDER BY similarity DESC
            LIMIT ${limit}
          `;
          return result;
        }
      }
    }
  });
}
