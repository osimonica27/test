import {
  Button,
  Input,
  Modal,
  SettingHeader,
  SettingRow,
  SettingWrapper,
} from '@affine/component/setting-components';
import { useI18n } from '@affine/i18n';
import { PlusIcon } from '@blocksuite/icons/rc';
import { 
  KeyboardShortcutsService,
  type ShortcutCategory,
  type KeyboardShortcut
} from '@affine/core/modules/editor-setting';
import { useService } from '@toeverything/infra';
import { useState } from 'react';

import type { ShortcutsInfo } from '../../../../../components/hooks/affine/use-shortcuts';
import {
  useEdgelessShortcuts,
  useGeneralShortcuts,
  useMarkdownShortcuts,
  usePageShortcuts,
} from '../../../../../components/hooks/affine/use-shortcuts';
import { editButton, resetButton, shortcutKey, shortcutKeyContainer, shortcutRow } from './style.css';

// Interface for shortcut editor modal
interface ShortcutEditorProps {
  open: boolean;
  onClose: () => void;
  category: ShortcutCategory;
  action: string;
  currentShortcut: KeyboardShortcut;
  onSave: (shortcut: KeyboardShortcut) => void;
}

// Component for editing a keyboard shortcut
const ShortcutEditor = ({ 
  open, 
  onClose, 
  category, 
  action, 
  currentShortcut, 
  onSave 
}: ShortcutEditorProps) => {
  const t = useI18n();
  const [shortcut, setShortcut] = useState<KeyboardShortcut>(currentShortcut);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shortcutsService = useService(KeyboardShortcutsService);

  // Handler for key capture during recording
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!recording) return;
    
    e.preventDefault();
    e.stopPropagation();

    // Build the shortcut array
    const newShortcut: string[] = [];
    
    if (e.metaKey) newShortcut.push('⌘');
    if (e.ctrlKey) newShortcut.push('Ctrl');
    if (e.altKey) newShortcut.push('Alt');
    if (e.shiftKey) newShortcut.push('Shift');
    
    // Add the main key (if it's not a modifier key)
    const key = e.key;
    if (
      !['Control', 'Shift', 'Alt', 'Meta'].includes(key) && 
      !newShortcut.includes(key)
    ) {
      // Convert key to display format
      let displayKey = key;
      if (key === ' ') displayKey = 'Space';
      else if (key === 'ArrowUp') displayKey = '↑';
      else if (key === 'ArrowDown') displayKey = '↓';
      else if (key === 'ArrowLeft') displayKey = '←';
      else if (key === 'ArrowRight') displayKey = '→';
      else if (key.length === 1) displayKey = key.toUpperCase();
      
      newShortcut.push(displayKey);
    }
    
    // Only update if we have a valid shortcut (at least one key)
    if (newShortcut.length > 0) {
      setShortcut(newShortcut);
      
      // Check for conflicts
      const conflicts = shortcutsService.findConflicts(category, action, newShortcut);
      if (conflicts.length > 0) {
        const conflictNames = conflicts.map(c => `${c.category}: ${c.action}`).join(', ');
        setError(t['com.affine.keyboardShortcuts.conflict']({ conflicts: conflictNames }));
      } else {
        setError(null);
      }
    }
  };

  const handleSave = () => {
    if (!error && shortcut.length > 0) {
      onSave(shortcut);
      onClose();
    }
  };

  const handleStartRecording = () => {
    setRecording(true);
    setShortcut([]);
    setError(null);
  };

  const handleStopRecording = () => {
    setRecording(false);
  };
  
  const handleReset = () => {
    shortcutsService.resetShortcut(category, action);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t['com.affine.keyboardShortcuts.editShortcut']()}
      width={500}
      height={300}
    >
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h3>{action}</h3>
          <p>{t['com.affine.keyboardShortcuts.editInstruction']()}</p>
        </div>
        
        <div 
          style={{ 
            border: '1px solid #ccc',
            padding: '10px',
            borderRadius: '4px',
            minHeight: '40px',
            display: 'flex',
            alignItems: 'center',
            marginBottom: '10px',
            backgroundColor: recording ? '#f0f0f0' : 'transparent',
            outline: recording ? '2px solid #1e88e5' : 'none'
          }}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onClick={handleStartRecording}
          onBlur={handleStopRecording}
        >
          {recording ? (
            t['com.affine.keyboardShortcuts.recordingKeys']()
          ) : (
            shortcut.length > 0 ? (
              <div className={shortcutKeyContainer}>
                {shortcut.map((key, index) => (
                  <span key={`${key}-${index}`} className={shortcutKey}>{key}</span>
                ))}
              </div>
            ) : (
              t['com.affine.keyboardShortcuts.clickToRecord']()
            )
          )}
        </div>
        
        {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <Button onClick={handleReset} size="small">
            {t['com.affine.keyboardShortcuts.resetToDefault']()}
          </Button>
          
          <div>
            <Button onClick={onClose} size="small">
              {t['com.affine.keyboardShortcuts.cancel']()}
            </Button>
            <Button 
              type="primary" 
              onClick={handleSave} 
              disabled={shortcut.length === 0 || !!error} 
              size="small"
              style={{ marginLeft: '10px' }}
            >
              {t['com.affine.keyboardShortcuts.save']()}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const ShortcutsPanel = ({
  shortcutsInfo,
  category,
}: {
  shortcutsInfo: ShortcutsInfo;
  category: ShortcutCategory;
}) => {
  const t = useI18n();
  const shortcutsService = useService(KeyboardShortcutsService);
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [currentShortcut, setCurrentShortcut] = useState<KeyboardShortcut>([]);

  const handleEditShortcut = (action: string, shortcut: KeyboardShortcut) => {
    setEditingAction(action);
    setCurrentShortcut(shortcut);
  };

  const handleSaveShortcut = (shortcut: KeyboardShortcut) => {
    if (editingAction) {
      shortcutsService.setShortcut(category, editingAction, shortcut);
    }
  };

  const handleResetAll = () => {
    shortcutsService.resetAllShortcuts();
  };

  return (
    <SettingWrapper 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span>{shortcutsInfo.title}</span>
          <Button onClick={handleResetAll} size="small" className={resetButton}>
            {t['com.affine.keyboardShortcuts.resetAll']()}
          </Button>
        </div>
      }
    >
      {Object.entries(shortcutsInfo.shortcuts).map(([action, shortcut]) => {
        return (
          <div key={action} className={shortcutRow}>
            <span>{action}</span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className={shortcutKeyContainer}>
                {shortcut.map((key, index) => (
                  <span className={shortcutKey} key={`${key}-${index}`}>{key}</span>
                ))}
              </div>
              <Button 
                className={editButton}
                type="text" 
                onClick={() => handleEditShortcut(action, shortcut)}
              >
                {t['com.affine.keyboardShortcuts.edit']()}
              </Button>
            </div>
          </div>
        );
      })}

      {/* Shortcut editor modal */}
      {editingAction && (
        <ShortcutEditor
          open={!!editingAction}
          onClose={() => setEditingAction(null)}
          category={category}
          action={editingAction}
          currentShortcut={currentShortcut}
          onSave={handleSaveShortcut}
        />
      )}
    </SettingWrapper>
  );
};

export const Shortcuts = () => {
  const t = useI18n();
  const shortcutsService = useService(KeyboardShortcutsService);

  // Initialize shortcuts with defaults if necessary
  useState(() => {
    shortcutsService.initializeShortcuts();
  });

  const markdownShortcutsInfo = useMarkdownShortcuts();
  const pageShortcutsInfo = usePageShortcuts();
  const edgelessShortcutsInfo = useEdgelessShortcuts();
  const generalShortcutsInfo = useGeneralShortcuts();

  return (
    <>
      <SettingHeader
        title={t['com.affine.keyboardShortcuts.title']()}
        subtitle={t['com.affine.keyboardShortcuts.subtitle']()}
        data-testid="keyboard-shortcuts-title"
      />
      <ShortcutsPanel shortcutsInfo={generalShortcutsInfo} category="general" />
      <ShortcutsPanel shortcutsInfo={pageShortcutsInfo} category="page" />
      <ShortcutsPanel shortcutsInfo={edgelessShortcutsInfo} category="edgeless" />
      <ShortcutsPanel shortcutsInfo={markdownShortcutsInfo} category="markdown" />
    </>
  );
};
