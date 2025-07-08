import React from 'react';

// Reusable Icon Button Component
const IconButton = ({ onClick, icon, text, className = '' }) => (
  <button onClick={onClick} className={`icon-button ${className}`}>
    {icon}
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

const Controls = ({ onReset, onFlip, onAnalyze, onUndo, onRedo, canUndo, canRedo, engineSettings, setEngineSettings, sendCommand, analyzeSide, setAnalyzeSide, onFenClick, onPgnClick }) => {
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

  return (
    <div className="panel controls">
      <div className="control-group">
        <IconButton onClick={onAnalyze} icon={<AnalyzeIcon />} text="Next Move" className="button-primary" />
      </div>

      <div className="control-group">
        <select
          id="analyzeSide"
          value={analyzeSide}
          onChange={(e) => setAnalyzeSide(e.target.value)}
        >
          <option value="current">Current Turn</option>
          <option value="white">White</option>
          <option value="black">Black</option>
        </select>
      </div>

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

      <div className="control-group">
        <label htmlFor="threads">CPU Threads</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input 
            type="range" 
            id="threads"
            min="1" 
            max="16" // Assuming a reasonable max
            value={engineSettings.threads}
            onChange={handleThreadsChange}
            style={{ flex: 1 }}
          />
          <span style={{ minWidth: '20px', textAlign: 'right' }}>{engineSettings.threads}</span>
        </div>
      </div>

      <div className="control-group">
        <label htmlFor="hash">Hash Size (MB)</label>
        <select 
          id="hash"
          value={engineSettings.hashSize}
          onChange={handleHashChange}
        >
          {[16, 32, 64, 128, 256, 512, 1024].map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Controls;