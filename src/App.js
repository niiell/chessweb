import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { io } from 'socket.io-client';
import './App.css';

function App() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [evaluation, setEvaluation] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [rawEvaluation, setRawEvaluation] = useState(null);
  const [bestMove, setBestMove] = useState('');
  const [movetime, setMovetime] = useState(1000); // Default 1 second
  const [threads, setThreads] = useState(1); // Default 1 thread
  const [hashSize, setHashSize] = useState(16); // Default 16 MB
  
  const [gameHistory, setGameHistory] = useState([game.fen()]);
  const historyIndexRef = useRef(0);
  const [historyIndex, setHistoryIndex] = useState(0); // This is just to trigger re-renders
  const [lastMove, setLastMove] = useState(null); // To store the last move for arrow display
  
  const socket = useRef(null);

  const sendCommandToBackend = React.useCallback(async (command) => {
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
  }, []);

  const setStockfishOption = async (name, value) => {
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
  };

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
          setEvaluation(scoreType === 'cp' ? `Evaluation: ${scoreValue / 100.0}` : `Mate in ${scoreValue}`);
          setRawEvaluation(scoreValue);
        }
      } else if (data.type === 'bestmove') {
        setBestMove(`Best move: ${data.move}`);
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
    // No longer automatically send 'go depth 15' here, it will be triggered by button
  }, [fen, sendCommandToBackend]);

  useEffect(() => {
    setStockfishOption('Threads', threads);
    setStockfishOption('Hash', hashSize);
  }, [threads, hashSize]);

  



  const calculateNextMove = React.useCallback(() => {
    setBestMove(''); // Clear previous best move
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
          alert(`Invalid move: ${data.error}`);
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
        alert('Error communicating with backend.');
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
      } catch (error) {
        console.error("Error loading PGN:", error);
        alert("Invalid PGN. Please check the format.");
      }
    }
  };

  const copyPgn = () => {
    navigator.clipboard.writeText(game.pgn());
    alert("PGN copied to clipboard!");
  };

  return (
    <div className="App">
      <header className="App-header">
        
      </header>
      <div className="App-body">
        <div className="chessboard-container">
          {console.log("Rendering Chessboard with FEN:", fen, "and Orientation:", boardOrientation)}
          <Chessboard
            id="my-chessboard"
            position={fen}
            onPieceDrop={onDrop}
            boardOrientation={boardOrientation}
            allowDrag={true}
            boardWidth={560}
            customDarkSquareStyle={{ backgroundColor: 'var(--board-dark-square)' }}
            customLightSquareStyle={{ backgroundColor: 'var(--board-light-square)' }}
            boardBorderRadius={8}
            customArrows={lastMove ? [[lastMove.from, lastMove.to]] : []}
          />
        </div>
        <div className="controls">
          <button onClick={resetGame}>New Game</button>
          <button onClick={flipBoard}>Flip Board</button>
          <button onClick={undoMove}>Undo</button>
          <button onClick={redoMove}>Redo</button>
          <button onClick={calculateNextMove}>Calculate Next Move</button>
          
          <div className="turn-options">
            <label>Set Turn:</label>
            <button onClick={() => setTurn('white')}>White to move</button>
            <button onClick={() => setTurn('black')}>Black to move</button>
          </div>
          <div className="fen-display">
            <label>FEN:</label>
            <input type="text" value={fen} onChange={(e) => {
              try {
                game.load(e.target.value);
                setFen(game.fen());
              } catch (error) {
                // Invalid FEN, do nothing or show error
              }
            }} />
          </div>
          <div className="evaluation-display">
            <label>Evaluation:</label>
            <span>{evaluation}</span>
          </div>
          <div className="best-move-display">
            <label>Best Move:</label>
            <span>{bestMove}</span>
          </div>
          
          <button onClick={loadPgn}>Load PGN</button>
          <button onClick={copyPgn}>Copy PGN</button>
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
        </div>
      </div>
    </div>
  );
}

export default App;