import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Chess } from 'chess.js';
import { io } from 'socket.io-client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import Modal from './Modal';

// Lazy load components for better initial load time
const EvaluationSection = React.lazy(() => import('./EvaluationSection'));
const ChessboardContainer = React.lazy(() => import('./ChessboardContainer'));
const Controls = React.lazy(() => import('./Controls'));

function App() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [moveHistory, setMoveHistory] = useState([game.fen()]); // Initialize with starting FEN
  const [historyPointer, setHistoryPointer] = useState(0); // Pointer to current position in history
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [stockfishEval, setStockfishEval] = useState({ score: null, type: 'cp' });
  const [lastMove, setLastMove] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analyzeSide, setAnalyzeSide] = useState('current'); // 'current', 'white', 'black'

  const [showFenModal, setShowFenModal] = useState(false);
  const [showPgnModal, setShowPgnModal] = useState(false);
  const [fenInput, setFenInput] = useState('');
  const [pgnInput, setPgnInput] = useState('');

  // Engine settings
  const [movetime, setMovetime] = useState(1000);
  const [threads, setThreads] = useState(4);
  const [hashSize, setHashSize] = useState(128);

  const analysisFenRef = useRef(null);

  const socket = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500); // Shorter loading time
    return () => clearTimeout(timer);
  }, []);

  const sendCommand = React.useCallback((command) => {
    console.log('Sending command:', command);
    console.log('Socket connected status:', socket.current && socket.current.connected); // Added log
    if (socket.current && socket.current.connected) {
      socket.current.emit('command', command);
    } else {
      console.warn('Socket not connected, command not sent:', command); // Added warning
    }
  }, []);

  useEffect(() => {
    socket.current = io('http://localhost:3001');

    socket.current.on('connect', () => {
      console.log('Connected to backend');
      // Setup initial engine parameters
      sendCommand('uci');
      sendCommand(`setoption name Threads value ${threads}`);
      sendCommand(`setoption name Hash value ${hashSize}`);
      sendCommand('isready');
    });

    socket.current.on('stockfish_output', (data) => {
      console.log('Received Stockfish output:', data); // Added log
        if (data.type === 'info' && data.score) {
          setStockfishEval({ score: data.score.value, type: data.score.type });
        } else if (data.type === 'bestmove') {
          console.log('Received bestmove from Stockfish:', data.move); // Added log
          const gameCopy = new Chess(analysisFenRef.current || fen); // Use the analysis FEN if available
          const moveResult = gameCopy.move(data.move, { sloppy: true }); // Added sloppy flag
          if (moveResult) {
            console.log('Bestmove applied successfully. New FEN:', gameCopy.fen()); // Added log
            setFen(gameCopy.fen());
            setLastMove({ from: moveResult.from, to: moveResult.to });
            analysisFenRef.current = null; // Reset the analysis FEN
          } else {
            console.warn('Failed to apply bestmove:', data.move); // Added warning
          }
        }
    });

    socket.current.on('stockfish_error', (error) => toast.error(`Engine Error: ${error}`));

    return () => socket.current.disconnect();
  }, [sendCommand, threads, hashSize]);

  // Calculate evaluation bar height
  let whiteHeight = 50;
  if (stockfishEval.score !== null) {
    if (stockfishEval.type === 'mate') {
      whiteHeight = stockfishEval.score > 0 ? 100 : 0;
    } else {
      const scoreInPawns = stockfishEval.score / 100;
      // Clamp score between -10 and 10 for bar calculation
      const clampedScore = Math.max(-10, Math.min(10, scoreInPawns));
      whiteHeight = 50 + clampedScore * 5; // 5% per pawn advantage
    }
    if (boardOrientation === 'black') {
      whiteHeight = 100 - whiteHeight;
    }
  }

  const onDrop = (sourceSquare, targetSquare) => {
    const gameCopy = new Chess(fen);
    const move = gameCopy.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });

    if (move === null) return false; // Illegal move

    const newFen = gameCopy.fen();
    setFen(newFen);
    setLastMove({ from: move.from, to: move.to });

    // Update move history
    const newHistory = moveHistory.slice(0, historyPointer + 1);
    setMoveHistory([...newHistory, newFen]);
    setHistoryPointer(newHistory.length);

    sendCommand(`position fen ${newFen}`);
    return true;
  };

  const undoMove = () => {
    if (historyPointer > 0) {
      const newPointer = historyPointer - 1;
      setHistoryPointer(newPointer);
      setFen(moveHistory[newPointer]);
      setLastMove(null); // Clear last move on undo
      sendCommand(`position fen ${moveHistory[newPointer]}`);
    } else {
      toast.info('No moves to undo.');
    }
  };

  const redoMove = () => {
    if (historyPointer < moveHistory.length - 1) {
      const newPointer = historyPointer + 1;
      setHistoryPointer(newPointer);
      setFen(moveHistory[newPointer]);
      setLastMove(null); // Clear last move on redo
      sendCommand(`position fen ${moveHistory[newPointer]}`);
    } else {
      toast.info('No moves to redo.');
    }
  };

  const calculateNextMove = () => {
    console.log('calculateNextMove called');
    let currentFen = fen;
    if (analyzeSide !== 'current') {
      const parts = fen.split(' ');
      parts[1] = analyzeSide === 'white' ? 'w' : 'b';
      currentFen = parts.join(' ');
      console.log(`Analyzing for ${analyzeSide}. Modified FEN: ${currentFen}`);
    }
    analysisFenRef.current = currentFen;
    sendCommand(`position fen ${currentFen}`);
    sendCommand(`go movetime ${movetime}`);
  };

  const resetGame = () => {
    const newGame = new Chess();
    const initialFen = newGame.fen();
    setGame(newGame);
    setFen(initialFen);
    setLastMove(null);
    setStockfishEval({ score: null, type: 'cp' });
    setMoveHistory([initialFen]);
    setHistoryPointer(0);
    toast.info('New game started.');
  };

  const flipBoard = () => setBoardOrientation(p => (p === 'white' ? 'black' : 'white'));

  const handleFenClick = () => {
    setFenInput(game.fen());
    setShowFenModal(true);
  };

  const handlePgnClick = () => {
    setPgnInput(game.pgn());
    setShowPgnModal(true);
  };

  const handleCopyFen = () => {
    navigator.clipboard.writeText(fenInput);
    toast.success('FEN copied to clipboard!');
    setShowFenModal(false);
  };

  const handleImportFen = () => {
    try {
      const newGame = new Chess(fenInput);
      setGame(newGame);
      setFen(newGame.fen());
      setLastMove(null);
      setStockfishEval({ score: null, type: 'cp' });
      toast.success('FEN imported successfully!');
      setShowFenModal(false);
    } catch (error) {
      toast.error('Invalid FEN string.');
      console.error('FEN import error:', error);
    }
  };

  const handleCopyPgn = () => {
    navigator.clipboard.writeText(pgnInput);
    toast.success('PGN copied to clipboard!');
    setShowPgnModal(false);
  };

  const handleImportPgn = () => {
    try {
      const newGame = new Chess();
      newGame.load_pgn(pgnInput);
      setGame(newGame);
      setFen(newGame.fen());
      setLastMove(null);
      setStockfishEval({ score: null, type: 'cp' });
      toast.success('PGN imported successfully!');
      setShowPgnModal(false);
    } catch (error) {
      toast.error('Invalid PGN string.');
      console.error('PGN import error:', error);
    }
  };

  if (isLoading) {
    // You can add a loading screen component here if you have one
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1></h1>
      </header>

      <main className="App-body">
        <Suspense fallback={<div className="panel">Loading...</div>}>
          <EvaluationSection 
            evaluation={stockfishEval} 
            orientation={boardOrientation}
            whiteHeight={whiteHeight}
          />
        </Suspense>

        <Suspense fallback={<div className="chessboard-container-wrapper">Loading...</div>}>
          <ChessboardContainer
            fen={fen}
            onDrop={onDrop}
            boardOrientation={boardOrientation}
            lastMove={lastMove}
          />
        </Suspense>

        <Suspense fallback={<div className="panel">Loading...</div>}>
          <Controls
            onReset={resetGame}
            onFlip={flipBoard}
            onAnalyze={calculateNextMove}
            onUndo={undoMove}
            onRedo={redoMove}
            canUndo={historyPointer > 0}
            canRedo={historyPointer < moveHistory.length - 1}
            engineSettings={{ movetime, threads, hashSize }}
            setEngineSettings={{ setMovetime, setThreads, setHashSize }}
            sendCommand={sendCommand}
            analyzeSide={analyzeSide}
            setAnalyzeSide={setAnalyzeSide}
            onFenClick={handleFenClick}
            onPgnClick={handlePgnClick}
          />
        </Suspense>
      </main>

      <ToastContainer 
        position="bottom-right" 
        autoClose={3000} 
        hideProgressBar={false} 
        newestOnTop={false} 
        closeOnClick 
        rtl={false} 
        pauseOnFocusLoss 
        draggable 
        pauseOnHover 
        theme="dark"
      />

      <Modal isOpen={showFenModal} onClose={() => setShowFenModal(false)} title="FEN">
        <textarea
          rows="3"
          value={fenInput}
          onChange={(e) => setFenInput(e.target.value)}
          placeholder="Enter FEN string"
        />
        <div className="button-group">
          <button className="button-secondary" onClick={handleCopyFen}>Copy</button>
          <button className="button-primary" onClick={handleImportFen}>Import</button>
        </div>
      </Modal>

      <Modal isOpen={showPgnModal} onClose={() => setShowPgnModal(false)} title="PGN">
        <textarea
          rows="10"
          value={pgnInput}
          onChange={(e) => setPgnInput(e.target.value)}
          placeholder="Enter PGN string"
        />
        <div className="button-group">
          <button className="button-secondary" onClick={handleCopyPgn}>Copy</button>
          <button className="button-primary" onClick={handleImportPgn}>Import</button>
        </div>
      </Modal>
    </div>
  );
}

export default App;