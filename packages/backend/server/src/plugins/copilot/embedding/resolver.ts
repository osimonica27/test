import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { EmbeddingService } from './service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthGuard, CurrentUser } from '../../../core/auth';
import { UserInfo } from '../../../core/auth/types';

@Resolver()
@UseGuards(AuthGuard)
export class EmbeddingResolver {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Mutation(() => Boolean)
  async generateDocumentEmbedding(
    @CurrentUser() user: UserInfo,
    @Args('workspaceId') workspaceId: string,
    @Args('docId') docId: string,
  ): Promise<boolean> {
    // Emit an event to process the document asynchronously
    this.eventEmitter.emit('workspace.doc.embedding', {
      workspaceId,
      docId,
    });
    return true;
  }

  @Mutation(() => Boolean)
  async deleteDocumentEmbedding(
    @CurrentUser() user: UserInfo,
    @Args('docId') docId: string,
  ): Promise<boolean> {
    await this.embeddingService.deleteDocumentEmbeddings(docId);
    return true;
  }

  @Query(() => [SimilarContentResult])
  async findSimilarContent(
    @CurrentUser() user: UserInfo,
    @Args('workspaceId') workspaceId: string,
    @Args('query') query: string,
    @Args('limit', { nullable: true, defaultValue: 5 }) limit: number,
    @Args('threshold', { nullable: true, defaultValue: 0.7 }) threshold: number,
  ): Promise<SimilarContentResult[]> {
    return await this.embeddingService.findSimilarContent(
      workspaceId,
      query,
      limit,
      threshold,
    );
  }
}

// Define a class to match the GraphQL return type
class SimilarContentResult {
  docId: string;
  content: string;
  similarity: number;
}
