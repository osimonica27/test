import { CopilotClient } from './copilot-client';
import { gql } from 'graphql-tag';

// Interface for similar document response
export interface SimilarDocumentResult {
  docId: string;
  title: string | null;
  content: string | null;
  score: number;
}

// Input parameters for getSimilarDocsForContext
export interface GetSimilarDocsParams {
  workspaceId: string;
  sessionId: string;
  contextId: string;
  query: string;
  limit?: number;
}

// GraphQL query for fetching similar documents
const GET_SIMILAR_DOCS = gql`
  query GetSimilarDocs(
    $workspaceId: String!
    $sessionId: String!
    $contextId: String!
    $query: String!
    $limit: Int
  ) {
    similarDocs(
      workspaceId: $workspaceId
      sessionId: $sessionId
      contextId: $contextId
      query: $query
      limit: $limit
    ) {
      docId
      title
      content
      score
    }
  }
`;

// Function to extend the CopilotClient with embedding capabilities
export function extendCopilotClient() {
  // Add the getSimilarDocsForContext method to the CopilotClient prototype
  CopilotClient.prototype.getSimilarDocsForContext = async function (
    params: GetSimilarDocsParams
  ): Promise<SimilarDocumentResult[]> {
    const { workspaceId, sessionId, contextId, query, limit = 5 } = params;
    
    try {
      // Execute the GraphQL query
      const response = await this.gql({
        query: GET_SIMILAR_DOCS,
        variables: {
          workspaceId,
          sessionId,
          contextId,
          query,
          limit,
        },
      });
      
      // Extract the results from the response
      if (response.data?.similarDocs) {
        return response.data.similarDocs;
      }
      
      // Return empty array if no results found
      return [];
    } catch (error) {
      console.error('Error getting similar docs:', error);
      throw error;
    }
  };
}

// Extend the CopilotClient type definition
declare module './copilot-client' {
  interface CopilotClient {
    getSimilarDocsForContext(params: GetSimilarDocsParams): Promise<SimilarDocumentResult[]>;
  }
}
