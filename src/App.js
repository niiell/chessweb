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
  const [event, setEvent] = useState('');
  const [site, setSite] = useState('');
  const [date, setDate] = useState('');
  const [round, setRound] = useState('');
  const [white, setWhite] = useState('');
  const [black, setBlack] = useState('');
  const [result, setResult] = useState('*');
  const socket = useRef(null);

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

  useEffect(() => {
    sendCommandToBackend('uci');
    sendCommandToBackend('isready');
  }, []);

  useEffect(() => {
    sendCommandToBackend(`position fen ${fen}`);
    // No longer automatically send 'go depth 15' here, it will be triggered by button
  }, [fen]);

  useEffect(() => {
    setPgn(game.pgn());
  }, [game]);

  console.log("Initial game object:", game);
  console.log("Initial FEN:", fen);
  console.log("Initial board orientation:", boardOrientation);

  function onDrop(sourceSquare, targetSquare) {
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
    sendCommandToBackend('go depth 15'); // Request best move from Stockfish
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
          <button onClick={loadPgn}>Load PGN</button>
          <button onClick={copyPgn}>Copy PGN</button>
        </div>
      </div>
    </div>
  );
}

export default App;