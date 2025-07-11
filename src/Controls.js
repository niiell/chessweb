import React, { useState, useEffect } from 'react';
import Spinner from './Spinner'; // Import the Spinner component

// Reusable Icon Button Component
const IconButton = ({ onClick, icon, text, className = '', disabled = false, isAnalyzing = false }) => (
  <button onClick={onClick} className={`icon-button ${className}`} disabled={disabled || isAnalyzing}>
    {isAnalyzing ? <Spinner /> : icon}
    <span>{text}</span>
  </button>
);

// SVG Icons for a clean, modern look
const AnalyzeIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ResetIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>;
const FlipIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2.1l4 4-4 4"></path><path d="M3 12.6V8c0-1.1.9-2 2-2h14"></path><path d="M7 21.9l-4-4 4-4"></path><path d="M21 11.4V16c0 1.1-.9 2-2 2H5"></path></svg>;
const FenIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>;
const PgnIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>;
const UndoIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5L5 12l7 7z"></path><path d="M19 12H5"></path></svg>;
const RedoIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14l7-7-7-7z"></path><path d="M5 12h14"></path></svg>;

const Controls = ({ onReset, onFlip, onUndo, onRedo, canUndo, canRedo, engineSettings, setEngineSettings, sendCommand, onFenClick, onPgnClick, maxThreads, maxHashSize, isAutoMoveEnabled, setIsAutoMoveEnabled, userColor, setUserColor }) => {
  const [engines, setEngines] = useState([]);
  const [selectedEngine, setSelectedEngine] = useState('');

  useEffect(() => {
    fetch('http://localhost:3001/api/engines')
      .then(res => res.json())
      .then(data => {
        setEngines(data);
        if (data.length > 0) {
          setSelectedEngine(data[0]); // Select the first engine by default
        }
      })
      .catch(err => console.error('Error fetching engines:', err));
  }, []);

  const handleEngineChange = (e) => {
    const engineName = e.target.value;
    setSelectedEngine(engineName);
    fetch('http://localhost:3001/api/select-engine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engineName })
    })
    .then(res => res.json())
    .then(data => console.log(data.message))
    .catch(err => console.error('Error selecting engine:', err));
  };
  
  const handleThreadsChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setEngineSettings.setThreads(value);
    sendCommand(`setoption name Threads value ${value}`);
  };

  const handleHashChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setEngineSettings.setHashSize(value);
    sendCommand(`setoption name Hash value ${value}`);
  };

  const handleDepthAnalysisToggle = (e) => {
    setEngineSettings.setIsDepthAnalysisEnabled(e.target.checked);
  };

  return (
    <div className="panel controls">
      <div className="control-group">
        <div className="button-group">
          <IconButton onClick={onReset} icon={<ResetIcon />} text="New Game" />
          <IconButton onClick={onFlip} icon={<FlipIcon />} text="Flip Board" />
        </div>
      </div>

      <div className="control-group">
        <div className="button-group">
          <IconButton onClick={onUndo} icon={<UndoIcon />} text="Undo" disabled={!canUndo} />
          <IconButton onClick={onRedo} icon={<RedoIcon />} text="Redo" disabled={!canRedo} />
        </div>
      </div>

      <div className="control-group">
        <div className="button-group">
          <IconButton onClick={onFenClick} icon={<FenIcon />} text="FEN" />
          <IconButton onClick={onPgnClick} icon={<PgnIcon />} text="PGN" />
        </div>
      </div>

      <div className="control-group">
        <label htmlFor="engine-select">Chess Engine</label>
        <select id="engine-select" value={selectedEngine} onChange={handleEngineChange}>
          {engines.map(engine => (
            <option key={engine} value={engine}>{engine}</option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <label htmlFor="userColor">Play as:</label>
        <select
          id="userColor"
          value={userColor}
          onChange={(e) => setUserColor(e.target.value)}
        >
          <option value="white">White</option>
          <option value="black">Black</option>
        </select>
      </div>

      <div className="control-group">
        <label htmlFor="auto-move-toggle">Auto-move Opponent</label>
        <input 
          type="checkbox" 
          id="auto-move-toggle"
          checked={isAutoMoveEnabled}
          onChange={(e) => setIsAutoMoveEnabled(e.target.checked)}
        />
      </div>

      <div className="control-group">
        <label htmlFor="depth-analysis-toggle">Enable Depth Analysis</label>
        <input 
          type="checkbox" 
          id="depth-analysis-toggle"
          checked={engineSettings.isDepthAnalysisEnabled}
          onChange={handleDepthAnalysisToggle}
        />
      </div>

      <div className="control-group">
        <label htmlFor="movetime">Analysis Time (ms)</label>
        <select 
          id="movetime"
          value={engineSettings.movetime}
          onChange={(e) => setEngineSettings.setMovetime(parseInt(e.target.value, 10))}
        >
          {[1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000].map(time => (
            <option key={time} value={time}>{time}</option>
          ))}
        </select>
      </div>

      {engineSettings.isDepthAnalysisEnabled && (
        <div className="control-group">
          <label htmlFor="depth">Search Depth</label>
          <select 
            id="depth"
            value={engineSettings.depth}
            onChange={(e) => setEngineSettings.setDepth(parseInt(e.target.value, 10))}
          >
            {[10, 15, 20, 25, 30, 35, 40].map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      )}

      <div className="control-group">
        <label htmlFor="threads">CPU Threads</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input 
            type="range" 
            id="threads"
            min="1" 
            max={engineSettings.maxThreads}
            value={engineSettings.threads}
            onChange={handleThreadsChange}
            style={{ flex: 1 }}
          />
          <span style={{ minWidth: '20px', textAlign: 'right' }}>{engineSettings.threads}</span>
        </div>
      </div>

      <div className="control-group">
        <label htmlFor="hash">Hash Size (MB)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input 
            type="range" 
            id="hash"
            min="16" 
            max={engineSettings.maxHashSize}
            step="16" // Increment by 16MB
            value={engineSettings.hashSize}
            onChange={handleHashChange}
            style={{ flex: 1 }}
          />
          <span style={{ minWidth: '40px', textAlign: 'right' }}>{engineSettings.hashSize} MB</span>
        </div>
      </div>
    </div>
  );
};

export default Controls;