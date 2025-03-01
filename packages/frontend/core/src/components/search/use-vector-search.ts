import { useState, useEffect, useCallback } from 'react';
import type { DocMeta } from '@blocksuite/affine/store';
import { AIProvider } from '@affine/core/blocksuite/ai';
import { useSessionHistoryService } from '@affine/core/modules/session-history';
import { debounce } from '@affine/component/utils';

interface VectorSearchOptions {
  searchDelay?: number;
  searchLimit?: number;
}

export const useVectorSearch = (
  docList: DocMeta[],
  { searchDelay = 300, searchLimit = 5 }: VectorSearchOptions = {}
) => {
  const [searchText, setSearchText] = useState('');
  const [searchedList, setSearchedList] = useState<DocMeta[]>([]);
  const [isVectorSearching, setIsVectorSearching] = useState(false);
  const [searchError, setSearchError] = useState<Error | null>(null);
  const [isVectorSearchEnabled, setIsVectorSearchEnabled] = useState(false);

  const sessionHistoryService = useSessionHistoryService();

  useEffect(() => {
    // Check if vector search is available (CopilotClient configured)
    const client = AIProvider.getCopilotClient();
    setIsVectorSearchEnabled(client !== null);
  }, []);

  // Helper function to format document titles
  const formatDocTitle = useCallback((title: string) => {
    return title || 'Untitled';
  }, []);

  // Create debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string, workspaceId: string) => {
      if (!query.trim()) {
        setSearchedList([]);
        setIsVectorSearching(false);
        return;
      }

      setIsVectorSearching(true);
      setSearchError(null);

      try {
        const client = AIProvider.getCopilotClient();
        
        if (!client) {
          throw new Error('Vector search is not available');
        }

        const sessionId = sessionHistoryService.getSessionId();
        const contextId = `search-${Date.now()}`;

        const similarDocs = await client.getSimilarDocsForContext({
          workspaceId,
          sessionId: sessionId || 'unnamed-session',
          contextId,
          query,
          limit: searchLimit
        });

        // Convert to DocMeta format and merge with document titles from docList
        const results = similarDocs.map(doc => {
          // First look for matching doc in docList to get accurate metadata
          const existingDoc = docList.find(d => d.id === doc.docId);
          
          if (existingDoc) {
            return existingDoc;
          } else {
            // If not found, create a minimal DocMeta object
            return {
              id: doc.docId,
              title: formatDocTitle(doc.title || ''),
              updatedDate: new Date()
            };
          }
        });

        setSearchedList(results);
      } catch (error) {
        console.error('Vector search error:', error);
        setSearchError(error instanceof Error ? error : new Error(String(error)));
        
        // Fallback to basic text search
        const filteredList = docList.filter(doc => 
          doc.title.toLowerCase().includes(query.toLowerCase())
        );
        setSearchedList(filteredList);
      } finally {
        setIsVectorSearching(false);
      }
    }, searchDelay), 
    [docList, formatDocTitle, searchDelay, searchLimit, sessionHistoryService]
  );

  // Update search text and trigger search
  const updateSearchText = useCallback(
    (text: string) => {
      setSearchText(text);
      
      if (!text.trim()) {
        setSearchedList([]);
        return;
      }
      
      // Get workspace ID from the first doc if available
      const workspaceId = docList[0]?.id.split('-')[0] || '';
      
      if (workspaceId) {
        debouncedSearch(text, workspaceId);
      } else {
        setSearchError(new Error('No workspace found'));
      }
    },
    [debouncedSearch, docList]
  );

  return {
    searchText,
    updateSearchText,
    searchedList,
    isVectorSearching,
    searchError,
    isVectorSearchEnabled,
  };
};
