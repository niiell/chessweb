import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import './App.css';

function App() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [evaluation, setEvaluation] = useState('');
  const [bestMove, setBestMove] = useState('');
  const stockfishWorker = useRef(null);

  useEffect(() => {
    stockfishWorker.current = new Worker('StockfishWorker.js');
    stockfishWorker.current.onmessage = (e) => {
      const data = e.data;
      if (data.startsWith('info depth')) {
        const match = data.match(/score (cp|mate) (-?\d+)/);
        if (match) {
          const scoreType = match[1];
          const scoreValue = parseInt(match[2], 10);
          setEvaluation(scoreType === 'cp' ? `Evaluation: ${scoreValue / 100.0}` : `Mate in ${scoreValue}`);
        }
      } else if (data.startsWith('bestmove')) {
        const move = data.split(' ')[1];
        setBestMove(`Best move: ${move}`);
      }
    };

    return () => {
      stockfishWorker.current.terminate();
    };
  }, []);

  useEffect(() => {
    if (stockfishWorker.current) {
      stockfishWorker.current.postMessage(`position fen ${fen}`);
      stockfishWorker.current.postMessage('go depth 15');
    }
  }, [fen]);

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
    setBoardOrientation('white');
  };

  const flipBoard = () => {
    setBoardOrientation((prevOrientation) =>
      prevOrientation === 'white' ? 'black' : 'white'
    );
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
        </div>
      </div>
    </div>
  );
}

export default App;
