const { spawn } = require('child_process');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
const port = 3001;

app.use(cors());
app.use(express.json());

const STOCKFISH_PATH = '../stockfish/stockfish-windows-x86-64-avx2.exe';

let stockfishProcess;
let outputBuffer = '';
const game = new Chess();
let fenHistory = [];
let candidateMoves = [];
let fenHistoryForRepetition = [];
let multiPVEnabled = false;

function checkRepetitionAndSetMultiPV(fen) {
    fenHistoryForRepetition.push(fen);
    const repetitionCount = fenHistoryForRepetition.filter(f => f === fen).length;
    if (repetitionCount >= 2 && !multiPVEnabled) {
        stockfishProcess.stdin.write(`setoption name MultiPV value 3\n`);
        console.log('[Backend] MultiPV enabled due to repetition.');
        multiPVEnabled = true;
    } else if (repetitionCount < 2 && multiPVEnabled) {
        // Optionally disable MultiPV if repetition is broken, or keep it on
        // For now, we'll keep it on once enabled for simplicity
    }
}

function resetMultiPV() {
    stockfishProcess.stdin.write(`setoption name MultiPV value 1\n`);
    console.log('[Backend] MultiPV reset to 1.');
    multiPVEnabled = false;
    fenHistoryForRepetition = [];
}

function startStockfish() {
    stockfishProcess = spawn(STOCKFISH_PATH);

    stockfishProcess.stdout.on('data', (data) => {
        outputBuffer += data.toString();
        const lines = outputBuffer.split('\n');
        outputBuffer = lines.pop();
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;
            console.log(`[Stockfish Raw Output]: ${trimmedLine}`); // Added log for raw output
            if (trimmedLine.startsWith('info')) {
                const matchPv = trimmedLine.match(/ pv (.+)/);
                if (matchPv) {
                    const moves = matchPv[1].split(' ');
                    if (moves.length > 0) {
                        candidateMoves.push(moves[0]);
                    }
                }
                const matchScore = trimmedLine.match(/score (cp|mate) (-?\d+)/);
                const matchDepth = trimmedLine.match(/depth (\d+)/);
                const parsedOutput = {
                    type: 'info',
                    raw: trimmedLine,
                    score: matchScore ? { type: matchScore[1], value: parseInt(matchScore[2], 10) } : null,
                    pv: matchPv ? matchPv[1].split(' ') : [],
                    depth: matchDepth ? parseInt(matchDepth[1], 10) : null,
                };
                io.emit('stockfish_output', parsedOutput);
                console.log(`[Backend] Emitted info: ${JSON.stringify(parsedOutput)}`); // Added log for emitted info
            } else if (trimmedLine.startsWith('bestmove')) {
                const parts = trimmedLine.split(' ');
                const bestMove = parts[1];
                console.log(`[Backend] Emitting bestmove: ${bestMove}`);
                io.emit('stockfish_output', { type: 'bestmove', move: bestMove, fen: currentFenForAnalysis });
            }
        });
    });

    stockfishProcess.stderr.on('data', (data) => {
        console.error(`Stockfish stderr: ${data}`);
        io.emit('stockfish_error', data.toString());
    });

    stockfishProcess.on('close', (code) => {
        console.log(`Stockfish process exited with code ${code}`);
        io.emit('stockfish_status', { status: 'closed', code });
    });

    stockfishProcess.on('error', (err) => {
        console.error('Failed to start Stockfish process:', err);
        io.emit('stockfish_status', { status: 'error', message: err.message });
    });

    stockfishProcess.stdin.write('uci\n');
    // stockfishProcess.stdin.write('setoption name SyzygyPath value "../syzygy_tablebases/3-4-5 2022/"\n');
    // stockfishProcess.stdin.write('setoption name Use Syzygy value true\n');
    stockfishProcess.stdin.write('isready\n');
}

app.post('/make-move', (req, res) => {
    const { move, currentFen } = req.body;
    try {
        game.load(currentFen);
        const result = game.move(move);
        if (result) {
            io.emit('stockfish_output', { type: 'fen', fen: game.fen() });
            res.status(200).send({ success: true, newFen: game.fen() });
        } else {
            res.status(400).send({ error: 'Invalid move' });
        }
    } catch (e) {
        console.error('Error making move:', e);
        res.status(500).send({ error: e.message });
    }
});

app.post('/set-option', (req, res) => {
    const { name, value } = req.body;
    if (stockfishProcess && name && value !== undefined) {
        const command = `setoption name ${name} value ${value}\n`;
        stockfishProcess.stdin.write(command);
        console.log(`[Backend] Sent Stockfish option: ${command.trim()}`);
        res.status(200).send({ message: 'Option sent to Stockfish' });
    } else {
        res.status(400).send({ message: 'Invalid option or Stockfish not running' });
    }
});


io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('command', (command) => {
        if (stockfishProcess) {
            console.log(`[Frontend] Received command: ${command}`);
            if (command.startsWith('position fen')) {
                currentFenForAnalysis = command.substring(13);
                checkRepetitionAndSetMultiPV(currentFenForAnalysis);
            } else if (command === 'ucinewgame') {
                resetMultiPV();
            }
            stockfishProcess.stdin.write(`${command}\n`);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

startStockfish();

server.listen(port, () => {
    console.log(`Stockfish backend server listening at http://localhost:${port}`);
    console.log('Waiting for Stockfish output...');
});