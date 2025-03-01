-- Create pgvector extension if not exists
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document_embeddings table
CREATE TABLE "document_embeddings" (
    "id" VARCHAR NOT NULL,
    "doc_id" VARCHAR NOT NULL,
    "workspace_id" VARCHAR NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(256) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    
    CONSTRAINT "document_embeddings_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "document_embeddings_doc_id_idx" ON "document_embeddings"("doc_id");
CREATE INDEX "document_embeddings_workspace_id_idx" ON "document_embeddings"("workspace_id");
CREATE INDEX "document_embeddings_embedding_idx" ON "document_embeddings" USING ivfflat (embedding vector_cosine_ops);
