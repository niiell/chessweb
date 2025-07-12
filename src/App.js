/* eslint-disable no-undef */
/* eslint-disable no-undef */
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
  // Audio objects for check and checkmate sounds
  const checkSound = useRef(new Audio('/assets/sounds/check.mp3'));
  const checkmateSound = useRef(new Audio('/assets/sounds/checkmate.mp3'));

  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [moveHistory, setMoveHistory] = useState([game.fen()]); // Initialize with starting FEN
  const [historyPointer, setHistoryPointer] = useState(0); // Pointer to current position in history
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [userColor, setUserColor] = useState('white'); // New state for user's playing color
  const [stockfishEval, setStockfishEval] = useState({ score: null, type: 'cp' });
  const [lastMove, setLastMove] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDepthAnalysisEnabled, setIsDepthAnalysisEnabled] = useState(false); // New state for depth analysis toggle
  const [isAutoMoveEnabled, setIsAutoMoveEnabled] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [enginePurpose, setEnginePurpose] = useState(null); // 'auto-move' or 'user-analysis'

  const [showFenModal, setShowFenModal] = useState(false);
  const [showPgnModal, setShowPgnModal] = useState(false);
  const [fenInput, setFenInput] = useState('');
  const [pgnInput, setPgnInput] = useState('');

  // Engine settings
  const [movetime, setMovetime] = useState(1000);
  const [depth, setDepth] = useState(20); // New state for search depth
  const [threads, setThreads] = useState(4);
  const [maxThreads, setMaxThreads] = useState(navigator.hardwareConcurrency || 4);
  const [hashSize, setHashSize] = useState(128);
  const [maxHashSize, setMaxHashSize] = useState(() => {
    if (navigator.deviceMemory) {
      // Use half of the device memory in MB, rounded down to the nearest power of 2
      const memoryInMB = Math.floor(navigator.deviceMemory * 1024);
      return Math.pow(2, Math.floor(Math.log2(memoryInMB / 2)));
    }
    return 2048; // Default to 2GB if deviceMemory is not available
  });

  const socket = useRef(null);
  const analysisFenRef = useRef(null);

  const sendCommand = React.useCallback((command) => {
    console.log('Sending command:', command);
    console.log('Socket connected status:', socket.current && socket.current.connected); // Added log
    if (socket.current && socket.current.connected) {
      socket.current.emit('command', command);
    } else {
      console.warn('Socket not connected, command not sent:', command); // Added warning
    }
  }, []);

  const makeAutoOpponentMove = React.useCallback(() => {
    console.log('makeAutoOpponentMove called');
    setIsAnalyzing(true); // Start analysis
    setEnginePurpose('auto-move'); // Set purpose to auto-move
    sendCommand('stop'); // Stop any ongoing analysis

    const currentFen = fen; // Always analyze for the current FEN
    analysisFenRef.current = currentFen;
    sendCommand(`position fen ${currentFen}`);
    if (isDepthAnalysisEnabled) {
      sendCommand(`go depth ${depth}`);
    } else {
      sendCommand(`go movetime ${movetime}`);
    }
  }, [fen, isDepthAnalysisEnabled, depth, movetime, sendCommand]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500); // Shorter loading time
    return () => clearTimeout(timer);
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
          setStockfishEval({ score: data.score.value, type: data.score.type, depth: data.depth });
        } else if (data.type === 'bestmove') {
          console.log('Received bestmove from Stockfish:', data.move);

          // Only handle auto-move logic
          const gameCopy = new Chess(fen); // Use the current FEN
          const moveResult = gameCopy.move(data.move, { sloppy: true });
          if (moveResult) {
            console.log('Bestmove applied successfully. New FEN:', gameCopy.fen());
            setFen(gameCopy.fen());
            setLastMove({ from: moveResult.from, to: moveResult.to });
          } else {
            console.warn('Failed to apply bestmove:', data.move);
          }
        }
    });

    socket.current.on('stockfish_error', (error) => toast.error(`Engine Error: ${error}`));

    return () => socket.current.disconnect();
  }, [sendCommand, threads, hashSize, fen, isAutoMoveEnabled, userColor, makeAutoOpponentMove]);

  // Effect to trigger auto-move when enabled and it's opponent's turn
  useEffect(() => {
    if (isAutoMoveEnabled) {
      const turn = fen.split(' ')[1];
      const playerIsWhite = userColor === 'white'; // Use userColor to determine player's side
      const isOpponentTurn = (playerIsWhite && turn === 'b') || (!playerIsWhite && turn === 'w');

      if (isOpponentTurn) {
        makeAutoOpponentMove();
      }
    }
  }, [isAutoMoveEnabled, fen, userColor, makeAutoOpponentMove]);

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

  const onDrop = ({ sourceSquare, targetSquare }) => {
    const gameCopy = new Chess(fen);
    const moveOptions = { from: sourceSquare, to: targetSquare };

    // Check for pawn promotion
    const piece = gameCopy.get(sourceSquare);
    if (piece && piece.type === 'p' &&
       ((piece.color === 'w' && targetSquare[1] === '8') ||
        (piece.color === 'b' && targetSquare[1] === '1'))) {
      moveOptions.promotion = 'q'; // Default to queen promotion
    }

    console.log('onDrop: Current FEN:', fen);
    console.log('onDrop: Move Options:', moveOptions);

    const move = gameCopy.move(moveOptions);

    if (move === null) {
      toast.error('Illegal move!');
      return false; // Illegal move
    }

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
    sendCommand('ucinewgame');
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

      // Rebuild the history from the imported PGN
      const history = newGame.history({ verbose: true });
      const newMoveHistory = [new Chess().fen()]; // Start with the initial position
      const tempGame = new Chess();
      history.forEach(move => {
        tempGame.move(move);
        newMoveHistory.push(tempGame.fen());
      });
      setMoveHistory(newMoveHistory);
      setHistoryPointer(newMoveHistory.length - 1);


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
            isDepthAnalysisEnabled={isDepthAnalysisEnabled}
          />
        </Suspense>

        <Suspense fallback={<div className="chessboard-container-wrapper">Loading...</div>}>
          <ChessboardContainer
            fen={fen}
            onDrop={onDrop}
            boardOrientation={boardOrientation}
            lastMove={lastMove}
            isAutoMoveEnabled={isAutoMoveEnabled}
            makeAutoOpponentMove={makeAutoOpponentMove}
            userColor={userColor}
          />
        </Suspense>

        <Suspense fallback={<div className="panel">Loading...</div>}>
          <Controls
            onReset={resetGame}
            onFlip={flipBoard}
            onUndo={undoMove}
            onRedo={redoMove}
            canUndo={historyPointer > 0}
            canRedo={historyPointer < moveHistory.length - 1}
            engineSettings={{ movetime, threads, hashSize, maxThreads, maxHashSize, depth, isDepthAnalysisEnabled }}
            setEngineSettings={{ setMovetime, setThreads, setHashSize, setDepth, setIsDepthAnalysisEnabled }}
            sendCommand={sendCommand}
            onFenClick={handleFenClick}
            onPgnClick={handlePgnClick}
            isAutoMoveEnabled={isAutoMoveEnabled}
            setIsAutoMoveEnabled={setIsAutoMoveEnabled}
            userColor={userColor}
            setUserColor={setUserColor}
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