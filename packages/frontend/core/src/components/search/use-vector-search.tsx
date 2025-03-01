import type { DocMeta } from '@blocksuite/affine/store';
import { useEffect, useState } from 'react';

export const useVectorSearch = (list: DocMeta[]) => {
  const [value, onChange] = useState('');
  const [searchResults, setSearchResults] = useState<DocMeta[]>([]);
  const [isVectorSearching, setIsVectorSearching] = useState(false);
  const [searchError, setSearchError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (!value) {
      setSearchResults(list);
      return;
    }
    
    // Call backend embedding search API
    const fetchResults = async () => {
      setIsVectorSearching(true);
      setSearchError(null);
      
      try {
        const response = await fetch('/api/search/vector', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: value })
        });
        
        if (response.ok) {
          const { docIds } = await response.json();
          // Filter the list based on returned docIds
          const matchedDocs = list.filter(doc => docIds.includes(doc.id));
          setSearchResults(matchedDocs);
        } else {
          // Fallback to regular search
          console.warn('Vector search failed, falling back to regular search');
          setSearchResults(list.filter(v => 
            v.title.toLowerCase().includes(value.toLowerCase())
          ));
          
          if (response.status !== 404) {
            // Only set error if it's not just that the endpoint doesn't exist yet
            setSearchError(new Error(`Vector search failed: ${response.statusText}`));
          }
        }
      } catch (error) {
        console.error('Vector search failed:', error);
        // Fallback to regular search
        setSearchResults(list.filter(v => 
          v.title.toLowerCase().includes(value.toLowerCase())
        ));
        setSearchError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsVectorSearching(false);
      }
    };
    
    fetchResults();
  }, [value, list]);
  
  return {
    searchText: value,
    updateSearchText: onChange,
    searchedList: searchResults,
    isVectorSearching,
    searchError,
    isVectorSearchEnabled: true
  };
};
