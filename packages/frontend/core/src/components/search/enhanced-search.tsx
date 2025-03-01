import React, { useCallback, useState, useEffect } from 'react';
import { useVectorSearch } from './use-vector-search';
import type { DocMeta } from '@blocksuite/affine/store';
import { AIStarIcon } from '@blocksuite/affine/blocks';
import { useService } from '@toeverything/infra';
import { WorkspaceService } from '@affine/core/modules/workspace';

interface EnhancedSearchProps {
  docList: DocMeta[];
  onSearchSelect?: (docId: string) => void;
  placeholder?: string;
  className?: string;
}

export const EnhancedSearch: React.FC<EnhancedSearchProps> = ({
  docList,
  onSearchSelect,
  placeholder = 'Search with AI...',
  className,
}) => {
  const {
    searchText,
    updateSearchText,
    searchedList,
    isVectorSearching,
    searchError,
    isVectorSearchEnabled,
  } = useVectorSearch(docList);
  
  const workspaceService = useService(WorkspaceService);
  const [workspaceId, setWorkspaceId] = useState<string>('');
  
  useEffect(() => {
    if (workspaceService?.workspace) {
      setWorkspaceId(workspaceService.workspace.id);
    }
  }, [workspaceService]);
  
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateSearchText(e.target.value);
    },
    [updateSearchText]
  );
  
  const handleDocSelect = useCallback(
    (docId: string) => {
      onSearchSelect?.(docId);
      updateSearchText(''); // Clear search after selection
    },
    [onSearchSelect, updateSearchText]
  );
  
  return (
    <div className={`enhanced-search-container ${className || ''}`}>
      <div className="search-input-wrapper">
        <div className="search-icon">
          {isVectorSearchEnabled ? <>{AIStarIcon}</> : <span>🔍</span>}
        </div>
        <input
          type="text"
          value={searchText}
          onChange={handleSearchChange}
          placeholder={placeholder}
          className="search-input"
        />
        {isVectorSearching && (
          <div className="search-loading">
            <span className="loading-spinner"></span>
          </div>
        )}
      </div>
      
      {searchText && searchedList.length > 0 && (
        <div className="search-results">
          <ul>
            {searchedList.map(doc => (
              <li 
                key={doc.id} 
                onClick={() => handleDocSelect(doc.id)}
                className="search-result-item"
              >
                <span className="result-title">{doc.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {searchText && searchedList.length === 0 && !isVectorSearching && (
        <div className="no-results">
          No results found
        </div>
      )}
      
      {searchError && (
        <div className="search-error">
          Error: {searchError.message}
        </div>
      )}
      
      <style jsx>{`
        .enhanced-search-container {
          position: relative;
          width: 100%;
        }
        
        .search-input-wrapper {
          display: flex;
          align-items: center;
          border: 1px solid var(--affine-border-color);
          border-radius: 8px;
          padding: 8px 12px;
          background: var(--affine-background-secondary-color);
        }
        
        .search-icon {
          display: flex;
          align-items: center;
          margin-right: 8px;
          color: var(--affine-icon-secondary);
        }
        
        .search-input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: var(--affine-font-sm);
          color: var(--affine-text-primary-color);
        }
        
        .search-loading {
          display: flex;
          align-items: center;
        }
        
        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0, 0, 0, 0.1);
          border-left-color: var(--affine-primary-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .search-results {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          background: var(--affine-background-overlay-panel-color);
          border: 1px solid var(--affine-border-color);
          border-radius: 8px;
          box-shadow: var(--affine-shadow-1);
          z-index: 1000;
          max-height: 300px;
          overflow-y: auto;
        }
        
        .search-results ul {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        
        .search-result-item {
          padding: 8px 12px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .search-result-item:hover {
          background-color: var(--affine-hover-color);
        }
        
        .result-title {
          font-size: var(--affine-font-sm);
          color: var(--affine-text-primary-color);
        }
        
        .no-results, .search-error {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          padding: 12px;
          background: var(--affine-background-overlay-panel-color);
          border: 1px solid var(--affine-border-color);
          border-radius: 8px;
          color: var(--affine-text-secondary-color);
          font-size: var(--affine-font-xs);
        }
        
        .search-error {
          color: var(--affine-error-color);
        }
      `}</style>
    </div>
  );
};
