import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Chess } from 'chess.js';
import { io } from 'socket.io-client';
import { debounce } from 'lodash';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import Logo from './Logo';
import LoadingScreen from './LoadingScreen';

const EvaluationSection = React.lazy(() => import('./EvaluationSection'));
const ChessboardContainer = React.lazy(() => import('./ChessboardContainer'));
const Controls = React.lazy(() => import('./Controls'));

function App() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [stockfishFormattedEval, setStockfishFormattedEval] = useState('');
  const [stockfishRawEval, setStockfishRawEval] = useState(null);
  const [scoreType, setScoreType] = useState('cp'); // 'cp' or 'mate'
  const [movetime, setMovetime] = useState(1000); // Default 1 second
  const [threads, setThreads] = useState(1); // Default 1 thread
  const [hashSize, setHashSize] = useState(16); // Default 16 MB
  
  const [gameHistory, setGameHistory] = useState([game.fen()]);
  const historyIndexRef = useRef(0);
  // eslint-disable-next-line no-unused-vars
  const [historyIndex, setHistoryIndex] = useState(0); // This is just to trigger re-renders
  const [lastMove, setLastMove] = useState(null); // To store the last move for arrow display
  const [showFenPopup, setShowFenPopup] = useState(false);
  const [showPgnPopup, setShowPgnPopup] = useState(false);
  const [ripple, setRipple] = useState(null); // For ripple effect
  const [isEvalPulsing, setIsEvalPulsing] = useState(false); // For evaluation bar pulse
  const [isLoading, setIsLoading] = useState(true);

  // For 3D Tilt Effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [0, window.innerHeight], [10, -10]);
  const rotateY = useTransform(mouseX, [0, window.innerWidth], [-10, 10]);

  const handleMouseMove = (event) => {
    mouseX.set(event.clientX);
    mouseY.set(event.clientY);
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3000); // Simulate loading
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  const socket = useRef(null);

  const sendCommandToBackend = React.useCallback(
    debounce(async (command) => {
      try {
        const response = await fetch('http://localhost:3001/command', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ command }),
        });
        const data = await response.json();
        console.log('Backend response:', data);
      } catch (error) {
        console.error('Error sending command to backend:', error);
      }
    }, 300),
    []
  ); // Debounce by 300ms

  const setStockfishOption = React.useCallback(
    debounce(async (name, value) => {
      try {
        const response = await fetch('http://localhost:3001/set-option', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, value }),
        });
        const data = await response.json();
        console.log('Stockfish option response:', data);
      } catch (error) {
        console.error('Error setting Stockfish option:', error);
      }
    }, 300),
    []
  ); // Debounce by 300ms

  // Initialize WebSocket connection and listen for Stockfish output
  useEffect(() => {
    socket.current = io('http://localhost:3001');

    socket.current.on('connect', () => {
      console.log('Connected to Stockfish backend via WebSocket');
    });

    socket.current.on('stockfish_output', (data) => {
      console.log('Received Stockfish output:', data);
      if (data.type === 'info') {
        if (data.score) {
          const scoreType = data.score.type;
          const scoreValue = data.score.value;
          setScoreType(scoreType);
          setStockfishFormattedEval(scoreType === 'cp' ? `${(scoreValue / 100.0).toFixed(1)}` : `M${scoreValue}`);
          setStockfishRawEval(scoreValue);
        }
      } else if (data.type === 'bestmove') {
        setGame((prevGame) => {
          const gameCopy = new Chess(prevGame.fen());
          try {
            const moveResult = gameCopy.move(data.move);
            if (moveResult) {
              setFen(gameCopy.fen());
              setGameHistory((prevHistory) => {
                const newHistory = prevHistory.slice(0, historyIndexRef.current + 1);
                return [...newHistory, gameCopy.fen()];
              });
              historyIndexRef.current = historyIndexRef.current + 1;
              setHistoryIndex(historyIndexRef.current);
              setLastMove({ from: moveResult.from, to: moveResult.to }); // Set last move for arrow
            }
          } catch (error) {
            console.error("Error applying best move:", error);
          }
          return gameCopy;
        });
      } else if (data.type === 'fen') {
        const newFen = data.fen;
        setGame((prevGame) => {
          const gameCopy = new Chess(newFen);
          setFen(newFen);
          // Only update history if the FEN is different from the current one
          if (prevGame.fen() !== newFen) {
            setGameHistory((prevHistory) => {
              const newHistory = prevHistory.slice(0, historyIndexRef.current + 1);
              return [...newHistory, newFen];
            });
            historyIndexRef.current = historyIndexRef.current + 1;
            setHistoryIndex(historyIndexRef.current);
          }
          return gameCopy;
        });
      }
    });

    socket.current.on('stockfish_error', (error) => {
      console.error('Stockfish error:', error);
    });

    socket.current.on('stockfish_status', (status) => {
      console.log('Stockfish status:', status);
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

  useEffect(() => {
    sendCommandToBackend('uci');
    sendCommandToBackend('isready');
  }, [sendCommandToBackend]);

  useEffect(() => {
    sendCommandToBackend(`position fen ${fen}`);
  }, [fen, sendCommandToBackend]);

  useEffect(() => {
    setStockfishOption('Threads', threads);
    setStockfishOption('Hash', hashSize);
  }, [threads, hashSize]);

  useEffect(() => {
    if (stockfishFormattedEval) {
      setIsEvalPulsing(true);
      const timer = setTimeout(() => {
        setIsEvalPulsing(false);
      }, 1000); // Pulse for 1 second
      return () => clearTimeout(timer);
    }
  }, [stockfishFormattedEval]);

  const handleSquareClick = (square) => {
    const boardElement = document.getElementById('my-chessboard');
    if (!boardElement) return;

    const squareElement = boardElement.querySelector(`div[data-square='${square}']`);
    if (!squareElement) return;

    const rippleElement = document.createElement('span');
    rippleElement.classList.add('ripple-effect');
    squareElement.appendChild(rippleElement);

    // Remove the ripple element after the animation
    rippleElement.addEventListener('animationend', () => {
      rippleElement.remove();
    });
  };

  const calculateNextMove = React.useCallback(() => {
    sendCommandToBackend(`go movetime ${movetime}`); // Use movetime for search time
  }, [movetime, sendCommandToBackend]);

  console.log("Initial game object:", game);
  console.log("Initial FEN:", fen);
  console.log("Initial board orientation:", boardOrientation);

  const undoMove = () => {
    if (historyIndexRef.current > 0) {
      const newIndex = historyIndexRef.current - 1;
      historyIndexRef.current = newIndex;
      setHistoryIndex(newIndex); // Trigger re-render
      const newFen = gameHistory[newIndex];
      const gameCopy = new Chess(newFen);
      setGame(gameCopy);
      setFen(newFen);
      setLastMove(null); // Clear last move on undo
    }
  };

  const redoMove = () => {
    if (historyIndexRef.current < gameHistory.length - 1) {
      const newIndex = historyIndexRef.current + 1;
      historyIndexRef.current = newIndex;
      setHistoryIndex(newIndex); // Trigger re-render
      const newFen = gameHistory[newIndex];
      const gameCopy = new Chess(newFen);
      setGame(gameCopy);
      setFen(newFen);
      setLastMove(null); // Clear last move on redo
    }
  };

  function onDrop(sourceSquare, targetSquare) {
    const gameCopy = new Chess(fen);
    const piece = gameCopy.get(sourceSquare);

    const move = {
      from: sourceSquare,
      to: targetSquare,
    };

    // Only add promotion if it's a pawn move to the last rank
    if (piece && piece.type === 'p' &&
        ((piece.color === 'w' && targetSquare[1] === '8') ||
         (piece.color === 'b' && targetSquare[1] === '1'))) {
      move.promotion = 'q'; // Default to queen promotion
    }

    // Send the move to the backend for validation and application
    fetch('http://localhost:3001/make-move', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ move, currentFen: fen }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          console.error('Error making move:', data.error);
          toast.error(`Invalid move: ${data.error}`);
        } else {
          // Update game state and history immediately after a successful move
          const newGame = new Chess(data.newFen);
          setGame(newGame);
          setFen(newGame.fen());

          setGameHistory((prevHistory) => {
            const newHistory = prevHistory.slice(0, historyIndexRef.current + 1);
            return [...newHistory, newGame.fen()];
          });
          historyIndexRef.current = historyIndexRef.current + 1;
          setHistoryIndex(historyIndexRef.current);
          setLastMove({ from: sourceSquare, to: targetSquare }); // Set last move for arrow
          calculateNextMove(); // Trigger evaluation after a successful move
        }
      })
      .catch(error => {
        console.error('Error sending move to backend:', error);
        toast.error('Error communicating with backend.');
      });

    return true; // Always return true, as the backend will handle the move
  }

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setGameHistory([newGame.fen()]); // Reset game history
    historyIndexRef.current = 0; // Reset history index ref
    setHistoryIndex(0); // Trigger re-render for history index
    setBoardOrientation('white');
    setLastMove(null); // Clear last move on reset
  };

  const flipBoard = () => {
    setBoardOrientation((prevOrientation) =>
      prevOrientation === 'white' ? 'black' : 'white'
    );
  };



  const setTurn = (turn) => {
    setGame((prevGame) => {
      const gameCopy = new Chess(prevGame.fen());
      const currentFen = gameCopy.fen().split(' ');
      currentFen[1] = turn === 'white' ? 'w' : 'b';
      gameCopy.load(currentFen.join(' '));
      setFen(gameCopy.fen());
      return gameCopy;
    });
  };

  const loadPgn = () => {
    const pgnInput = prompt("Enter PGN:");
    if (pgnInput) {
      try {
        game.load_pgn(pgnInput);
        setFen(game.fen());
        setGameHistory([game.fen()]); // Reset history on PGN load
        historyIndexRef.current = 0;
        setHistoryIndex(0);
        setLastMove(null);
      } catch (error) {
        console.error("Error loading PGN:", error);
        toast.error("Invalid PGN. Please check the format.");
      }
    }
    setShowPgnPopup(false);
  };

  const copyPgn = () => {
    navigator.clipboard.writeText(game.pgn());
    toast.success("PGN copied to clipboard!");
    setShowPgnPopup(false);
  };

  const copyFen = () => {
    navigator.clipboard.writeText(fen);
    toast.success("FEN copied to clipboard!");
    setShowFenPopup(false);
  };

  const loadFen = () => {
    const fenInput = prompt("Enter FEN:");
    if (fenInput) {
      try {
        game.load(fenInput);
        setFen(game.fen());
        setGameHistory([game.fen()]);
        historyIndexRef.current = 0;
        setHistoryIndex(0);
        setLastMove(null);
      } catch (error) {
        console.error("Error loading FEN:", error);
        toast.error("Invalid FEN. Please check the format.");
      }
    }
    setShowFenPopup(false);
  };

  const toggleFenPopup = () => {
    setShowFenPopup(!showFenPopup);
    setShowPgnPopup(false); // Close PGN popup if open
  };

  const togglePgnPopup = () => {
    setShowPgnPopup(!showPgnPopup);
    setShowFenPopup(false); // Close FEN popup if open
  };

  // Calculate evaluation bar heights
  // Calculate evaluation for display and bar
  let effectiveRawEvaluation = stockfishRawEval;
  let effectiveFormattedEvaluation = ''; // Initialize to empty string

  if (stockfishRawEval !== null) {
    if (boardOrientation === 'black') {
      effectiveRawEvaluation = -stockfishRawEval;
    }

    // Always format effectiveFormattedEvaluation based on effectiveRawEvaluation
    if (scoreType === 'mate') {
      effectiveFormattedEvaluation = `M${effectiveRawEvaluation}`;
    } else {
      effectiveFormattedEvaluation = `${(effectiveRawEvaluation / 100.0).toFixed(1)}`;
    }
  }

  let whiteHeight = 50;
  let blackHeight = 50;

  if (effectiveRawEvaluation !== null) { // Use effectiveRawEvaluation for bar calculation
    if (scoreType === 'mate') { // Mate score
      if (effectiveRawEvaluation > 0) { // Winning
        whiteHeight = 100;
        blackHeight = 0;
      } else { // Losing
        whiteHeight = 0;
        blackHeight = 100;
      }
    } else { // Centipawn score
      // Normalize centipawn score to a percentage. Max advantage around 1000 cp (10 pawns)
      const normalizedScore = Math.max(-1000, Math.min(1000, effectiveRawEvaluation));
      // Convert to a 0-100 scale where 0 is -1000cp, 50 is 0cp, 100 is 1000cp
      whiteHeight = 50 + (normalizedScore / 20);
      blackHeight = 100 - whiteHeight;
    }
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <motion.div
      className="App"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
      }}
    >
      <div className="parallax-bg">
        <div className="parallax-layer layer-1"></div>
        <div className="parallax-layer layer-2"></div>
        <div className="parallax-layer layer-3"></div>
      </div>
      <Helmet>
        <title>ChessNova - Advanced Chess Analysis</title>
        <meta name="description" content="Play chess and analyze your games with Stockfish engine integration." />
        <meta name="keywords" content="chess, online chess, Stockfish, chess analysis, FEN, PGN" />
      </Helmet>
      <div className="flare flare-1"></div>
      <div className="flare flare-2"></div>
      <div className="flare flare-3"></div>
      <motion.header
        className="App-header"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0, y: -20 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut", delay: 0.2 } },
        }}
      >
        <div className="logo-container">
          <Logo />
          <h1>ChessNova</h1>
        </div>
      </motion.header>
      <motion.div
        className="App-body"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0, scale: 0.95 },
          visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: "easeOut", delay: 0.4 } },
        }}
      >
        <Suspense fallback={<div>Loading...</div>}>
          <EvaluationSection 
            effectiveFormattedEvaluation={effectiveFormattedEvaluation}
            isEvalPulsing={isEvalPulsing}
            boardOrientation={boardOrientation}
            whiteHeight={whiteHeight}
            blackHeight={blackHeight}
            resetGame={resetGame}
            flipBoard={flipBoard}
            undoMove={undoMove}
            redoMove={redoMove}
          />
          <ChessboardContainer
            fen={fen}
            onDrop={onDrop}
            handleSquareClick={handleSquareClick}
            boardOrientation={boardOrientation}
            lastMove={lastMove}
            rotateX={rotateX}
            rotateY={rotateY}
          />
          <Controls
            calculateNextMove={calculateNextMove}
            setTurn={setTurn}
            toggleFenPopup={toggleFenPopup}
            showFenPopup={showFenPopup}
            copyFen={copyFen}
            loadFen={loadFen}
            togglePgnPopup={togglePgnPopup}
            showPgnPopup={showPgnPopup}
            copyPgn={copyPgn}
            loadPgn={loadPgn}
            movetime={movetime}
            setMovetime={setMovetime}
            setStockfishOption={setStockfishOption}
            threads={threads}
            setThreads={setThreads}
            hashSize={hashSize}
            setHashSize={setHashSize}
          />
        </Suspense>
      </motion.div>
      <ToastContainer position="bottom-right" theme="dark" />
    </motion.div>
  );
}

export default App;