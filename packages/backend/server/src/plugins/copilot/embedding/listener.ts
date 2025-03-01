import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmbeddingService } from './service';
import { PrismaService } from '../../../core/prisma';

interface DocumentEmbeddingEvent {
  workspaceId: string;
  docId: string;
}

@Injectable()
export class EmbeddingEventListener {
  private readonly logger = new Logger(EmbeddingEventListener.name);

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent('workspace.doc.embedding')
  async handleDocumentEmbeddingEvent(event: DocumentEmbeddingEvent): Promise<void> {
    this.logger.debug(
      `Processing embedding event for document: ${event.docId} in workspace: ${event.workspaceId}`,
    );

    try {
      // First, fetch the document content
      const document = await this.prisma.document.findUnique({
        where: { id: event.docId },
        select: { content: true },
      });

      if (!document) {
        this.logger.warn(`Document ${event.docId} not found`);
        return;
      }

      // Process document content into chunks
      const chunks = this.processDocumentIntoChunks(document.content);
      
      // Delete existing embeddings for this document
      await this.embeddingService.deleteDocumentEmbeddings(event.docId);
      
      // Create new embeddings
      await this.embeddingService.createEmbedding(
        event.docId,
        event.workspaceId,
        chunks,
      );
      
      this.logger.log(`Successfully processed embeddings for document ${event.docId}`);
    } catch (error) {
      this.logger.error(
        `Error processing document ${event.docId} for embeddings: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Process document content into meaningful chunks for embedding
   */
  private processDocumentIntoChunks(content: string): { index: number; content: string }[] {
    // Simple implementation - split by paragraphs and limit size
    const MAX_CHUNK_SIZE = 1000; // Characters
    
    // Remove any markdown or HTML to get plain text
    const plainText = content.replace(/<[^>]*>?/gm, '');
    
    // Split by paragraphs
    const paragraphs = plainText.split(/\n\s*\n/);
    
    let currentChunk = '';
    let chunkIndex = 0;
    const chunks: { index: number; content: string }[] = [];
    
    for (const paragraph of paragraphs) {
      // Skip empty paragraphs
      if (!paragraph.trim()) continue;
      
      // If adding this paragraph would exceed chunk size, start a new chunk
      if ((currentChunk.length + paragraph.length) > MAX_CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push({ index: chunkIndex++, content: currentChunk.trim() });
        currentChunk = '';
      }
      
      currentChunk += paragraph + ' ';
    }
    
    // Add the last chunk if it's not empty
    if (currentChunk.trim()) {
      chunks.push({ index: chunkIndex, content: currentChunk.trim() });
    }
    
    return chunks;
  }
}
