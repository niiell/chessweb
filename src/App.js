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
  const [bestMove, setBestMove] = useState('');
  const [pgn, setPgn] = useState('');
  const [movetime, setMovetime] = useState(1000); // Default 1 second
  const [multiPV, setMultiPV] = useState(1); // Default 1 principal variation
  const [threads, setThreads] = useState(1); // Default 1 thread
  const [hashSize, setHashSize] = useState(16); // Default 16 MB
  const [moveClassification, setMoveClassification] = useState('');
  const [rawEvaluation, setRawEvaluation] = useState(0);
  const [squareStyles, setSquareStyles] = useState({});
  const [event, setEvent] = useState('');
  const [site, setSite] = useState('');
  const [date, setDate] = useState('');
  const [round, setRound] = useState('');
  const [white, setWhite] = useState('');
  const [black, setBlack] = useState('');
  const [result, setResult] = useState('*');
  const socket = useRef(null);

  const sendCommandToBackend = async (command) => {
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
  };

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
        // Calculate SAN for display
        setGame((prevGame) => {
          const tempGame = new Chess(prevGame.fen()); // Use current FEN to create a temporary game
          const moveObject = tempGame.move(data.move);
          if (moveObject) {
            setBestMove(`Best move: ${moveObject.san}`);
          } else {
            setBestMove(`Best move: ${data.move} (Invalid SAN conversion)`); // Fallback
          }

          // Automatically make the best move
          const gameCopy = new Chess(prevGame.fen());
          try {
            const moveResult = gameCopy.move(data.move);
            if (moveResult) {
              setFen(gameCopy.fen());
              return gameCopy;
            }
          } catch (e) {
            console.error("Error making best move:", e);
          }
          return prevGame;
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
  }, []);

  useEffect(() => {
    sendCommandToBackend(`position fen ${fen}`);
    // No longer automatically send 'go depth 15' here, it will be triggered by button
  }, [fen]);

  useEffect(() => {
    setStockfishOption('MultiPV', multiPV);
    setStockfishOption('Threads', threads);
    setStockfishOption('Hash', hashSize);
  }, []);

  useEffect(() => {
    setPgn(game.pgn());
  }, [game]);

  console.log("Initial game object:", game);
  console.log("Initial FEN:", fen);
  console.log("Initial board orientation:", boardOrientation);

  function classifyMove(prevEval, currentEval, isWhiteTurn) {
    const evalChange = isWhiteTurn ? (currentEval - prevEval) / 100.0 : (prevEval - currentEval) / 100.0;

    if (game.in_checkmate()) return "Checkmate";
    if (game.in_draw()) return "Draw";
    if (game.in_stalemate()) return "Stalemate";
    if (game.in_threefold_repetition()) return "Threefold Repetition";
    if (game.insufficient_material()) return "Insufficient Material";

    // Check for book moves
    const history = game.history({ verbose: true });
    const lastMove = history[history.length - 1];
    if (lastMove && lastMove.san.startsWith("O-O")) {
        return "Book Move";
    }


    if (evalChange > 2) return "Brilliant";
    if (evalChange > 1) return "Great Move";
    if (evalChange > -0.5) return "Best Move";
    if (evalChange > -1) return "Good Move";
    if (evalChange > -2) return "Inaccuracy";
    if (evalChange > -3) return "Mistake";
    return "Blunder";
  }

  function getSquareStyles(classification, to) {
    const style = {};
    let icon = '';

    switch (classification) {
      case "Brilliant":
        icon = 'brilliant.svg'; // Replace with your icon path
        break;
      case "Great Move":
        icon = 'great-move.svg'; // Replace with your icon path
        break;
      case "Best Move":
        icon = 'best-move.svg'; // Replace with your icon path
        break;
      case "Book Move":
        icon = 'book-move.svg'; // Replace with your icon path
        break;
      case "Inaccuracy":
        icon = 'inaccuracy.svg'; // Replace with your icon path
        break;
      case "Mistake":
        icon = 'mistake.svg'; // Replace with your icon path
        break;
      case "Blunder":
        icon = 'blunder.svg'; // Replace with your icon path
        break;
      default:
        break;
    }

    if (icon) {
      style[to] = {
        backgroundImage: `url(${icon})`,
        backgroundSize: 'cover',
      };
    }

    return style;
  }

  function onDrop(sourceSquare, targetSquare) {
    const isWhiteTurn = game.turn() === "w";
    const prevEval = rawEvaluation;

    let move = null;
    setGame((prevGame) => {
      const gameCopy = new Chess(prevGame.fen());
      try {
        move = gameCopy.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q',
        });

        if (move === null) {
          return prevGame;
        }

        setFen(gameCopy.fen());
        sendCommandToBackend(`position fen ${gameCopy.fen()}`);
        sendCommandToBackend(`go movetime 1000`);
        socket.current.once('stockfish_output', (data) => {
            if (data.type === 'info' && data.score) {
                const currentEval = data.score.value;
                const classification = classifyMove(prevEval, currentEval, isWhiteTurn);
                setMoveClassification(classification);
                setSquareStyles(getSquareStyles(classification, targetSquare));
            }
        });

        return gameCopy;
      } catch (e) {
        return prevGame;
      }
    });
    return move !== null;
  }

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setPgn(newGame.pgn());
    setBoardOrientation('white');
  };

  const flipBoard = () => {
    setBoardOrientation((prevOrientation) =>
      prevOrientation === 'white' ? 'black' : 'white'
    );
  };

  const calculateNextMove = () => {
    sendCommandToBackend(`go movetime ${movetime}`); // Use movetime for search time
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
        setPgn(game.pgn());
      } catch (error) {
        console.error("Error loading PGN:", error);
        alert("Invalid PGN. Please check the format.");
      }
    }
  };

  const copyPgn = () => {
    setPgn(game.pgn());
    navigator.clipboard.writeText(game.pgn());
    alert("PGN copied to clipboard!");
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Chess Analyzer</h1>
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
            boardWidth={480}
            customSquareStyles={squareStyles}
          />
        </div>
        <div className="controls">
          <button onClick={resetGame}>New Game</button>
          <button onClick={flipBoard}>Flip Board</button>
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
          <div className="move-classification-display">
            <label>Move Classification:</label>
            <span>{moveClassification}</span>
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
            <label>MultiPV:</label>
            <input
              type="number"
              value={multiPV}
              onChange={(e) => {
                setMultiPV(e.target.value);
                setStockfishOption('MultiPV', e.target.value);
              }}
              min="1"
              max="5"
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