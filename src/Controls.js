import React from 'react';
import { motion } from 'framer-motion';

const Controls = ({ 
  calculateNextMove, 
  setTurn, 
  toggleFenPopup, 
  showFenPopup, 
  copyFen, 
  loadFen, 
  togglePgnPopup, 
  showPgnPopup, 
  copyPgn, 
  loadPgn, 
  movetime, 
  setMovetime, 
  setStockfishOption, 
  threads, 
  setThreads, 
  hashSize, 
  setHashSize 
}) => {
  return (
    <motion.div
      className="controls"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0, x: 50 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut", delay: 1.0 } },
      }}
    >
      <div className="turn-options">
        <label>Set Turn:</label>
        <button onClick={() => setTurn('white')}>White to move</button>
        <button onClick={() => setTurn('black')}>Black to move</button>
      </div>
      <div className="fen-pgn-controls">
        <div className="fen-control">
          <button onClick={toggleFenPopup}>FEN</button>
          {showFenPopup && (
            <div className="popup-menu">
              <button onClick={copyFen}>Copy FEN</button>
              <button onClick={loadFen}>Import FEN</button>
            </div>
          )}
        </div>
        <div className="pgn-control">
          <button onClick={togglePgnPopup}>PGN</button>
          {showPgnPopup && (
            <div className="popup-menu">
              <button onClick={copyPgn}>Copy PGN</button>
              <button onClick={loadPgn}>Import PGN</button>
            </div>
          )}
        </div>
      </div>
      <div className="engine-options">
        <label>Search Time (ms):</label>
        <input
          type="number"
          value={movetime}
          onChange={(e) => {
            setMovetime(e.target.value);
            setStockfishOption('Move Time', e.target.value);
          }}
          min="100"
          step="100"
        />
        
        <label>Threads:</label>
        <input
          type="number"
          value={threads}
          onChange={(e) => {
            setThreads(e.target.value);
            setStockfishOption('Threads', e.target.value);
          }}
          min="1"
          max="8"
        />
        <label>Hash Size (MB):</label>
        <input
          type="number"
          value={hashSize}
          onChange={(e) => {
            setHashSize(e.target.value);
            setStockfishOption('Hash', e.target.value);
          }}
          min="1"
          step="1"
        />
      </div>
    </motion.div>
  );
};

export default Controls;
