import React, { useState } from 'react';
import { MapEditorEngine } from '@ra4/map-editor';

export const App: React.FC = () => {
  const [editor] = useState(() => new MapEditorEngine('custom_map_1', 'Новая Карта', 64, 64));
  const [jsonOutput, setJsonOutput] = useState('');

  const handleExport = () => {
    setJsonOutput(editor.exportJSON());
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1>RA4 // Редактор Карт и Контентный Инструментарий</h1>
      <div>
        <button
          onClick={handleExport}
          style={{ padding: '10px 20px', background: '#ff4d4d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Экспортировать Карту в JSON
        </button>
      </div>

      {jsonOutput && (
        <pre style={{ background: '#161b22', padding: '15px', borderRadius: '6px', maxHeight: '400px', overflowY: 'auto' }}>
          {jsonOutput}
        </pre>
      )}
    </div>
  );
};
