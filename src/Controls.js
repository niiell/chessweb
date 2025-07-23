import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Repeat,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  Settings,
  Play,
  User,
  Cpu
} from 'react-feather';

const Section = ({ title, icon, children }) => (
  <div className="control-section">
    <h3 className="section-title">
      {icon}
      <span>{title}</span>
    </h3>
    <div className="section-content">{children}</div>
  </div>
);

const IconButton = ({ onClick, icon, text, disabled = false }) => (
  <button onClick={onClick} className="icon-button" disabled={disabled}>
    {icon}
    <span>{text}</span>
  </button>
);

const Toggle = ({ label, checked, onChange }) => (
  <div className="toggle-switch">
    <label>
      {label}
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="slider"></span>
    </label>
  </div>
);

const Controls = ({ 
  onReset, onFlip, onUndo, onRedo, canUndo, canRedo, 
  engineSettings, setEngineSettings, sendCommand, 
  onFenClick, onPgnClick, 
  isAutoMoveEnabled, setIsAutoMoveEnabled, 
  userColor, setUserColor 
}) => {
  const [engines, setEngines] = useState([]);
  const [selectedEngine, setSelectedEngine] = useState('');

  useEffect(() => {
    fetch('http://localhost:3001/api/engines')
      .then(res => res.json())
      .then(data => {
        setEngines(data);
        if (data.length > 0) {
          setSelectedEngine(data[0]);
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

  return (
    <div className="panel controls">
      <Section title="Game" icon={<Play size={20} />}>
        <div className="button-grid">
          <IconButton onClick={onReset} icon={<RotateCcw size={18} />} text="New" />
          <IconButton onClick={onFlip} icon={<Repeat size={18} />} text="Flip" />
          <IconButton onClick={onUndo} icon={<ChevronLeft size={18} />} text="Undo" disabled={!canUndo} />
          <IconButton onClick={onRedo} icon={<ChevronRight size={18} />} text="Redo" disabled={!canRedo} />
        </div>
      </Section>

      <Section title="Position" icon={<Upload size={20} />}>
        <div className="button-grid">
          <IconButton onClick={onFenClick} icon={<Download size={18} />} text="FEN" />
          <IconButton onClick={onPgnClick} icon={<Download size={18} />} text="PGN" />
        </div>
      </Section>

      <Section title="Player" icon={<User size={20} />}>
        <div className="control-group">
          <label htmlFor="userColor">Play as</label>
          <select id="userColor" value={userColor} onChange={(e) => setUserColor(e.target.value)}>
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
        </div>
        <Toggle 
          label="Auto-move Opponent"
          checked={isAutoMoveEnabled}
          onChange={(e) => setIsAutoMoveEnabled(e.target.checked)}
        />
      </Section>

      <Section title="Engine" icon={<Cpu size={20} />}>
        <div className="control-group">
          <label htmlFor="engine-select">Chess Engine</label>
          <select id="engine-select" value={selectedEngine} onChange={handleEngineChange}>
            {engines.map(engine => (
              <option key={engine} value={engine}>{engine}</option>
            ))}
          </select>
        </div>
        <Toggle 
          label="Depth Analysis"
          checked={engineSettings.isDepthAnalysisEnabled}
          onChange={(e) => setEngineSettings.setIsDepthAnalysisEnabled(e.target.checked)}
        />
        {!engineSettings.isDepthAnalysisEnabled ? (
          <div className="control-group">
            <label htmlFor="movetime">Analysis Time (ms)</label>
            <select id="movetime" value={engineSettings.movetime} onChange={(e) => setEngineSettings.setMovetime(parseInt(e.target.value, 10))}>
              {[1000, 2000, 3000, 5000, 10000].map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="control-group">
            <label htmlFor="depth">Search Depth</label>
            <select id="depth" value={engineSettings.depth} onChange={(e) => setEngineSettings.setDepth(parseInt(e.target.value, 10))}>
              {[10, 15, 20, 25, 30].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
        <div className="control-group">
          <label htmlFor="threads">CPU Threads: {engineSettings.threads}</label>
          <input type="range" id="threads" min="1" max={engineSettings.maxThreads} value={engineSettings.threads} onChange={handleThreadsChange} />
        </div>
        <div className="control-group">
          <label htmlFor="hash">Hash Size (MB)</label>
          <select id="hash" value={engineSettings.hashSize} onChange={handleHashChange}>
            {[16, 32, 64, 128, 256, 512, 1024].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </Section>
    </div>
  );
};

export default Controls;