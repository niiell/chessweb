const { spawn } = require('child_process');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Chess } = require('chess.js');
const fs = require('fs');
const path = require('path');

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

app.get('/api/engines', (req, res) => {
    fs.readdir(ENGINES_DIR, (err, files) => {
        if (err) {
            console.error('Error reading engines directory:', err);
            return res.status(500).send({ message: 'Could not retrieve engine list.' });
        }
        const engineFiles = files.filter(file => file.endsWith('.exe'));
        res.send(engineFiles);
    });
});

const ENGINES_DIR = path.join(__dirname, '../chessengines');
let currentEnginePath = path.join(ENGINES_DIR, 'stockfish-windows-x86-64-avx2.exe'); // Default engine

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
    stockfishProcess = spawn(currentEnginePath);

    stockfishProcess.stdout.on('data', (data) => {
        const rawOutput = data.toString();
        outputBuffer += rawOutput;
        console.log(`[Stockfish Raw Output]: ${rawOutput.trim()}`); // Log all raw output

        // Process complete lines
        let newlineIndex;
        while ((newlineIndex = outputBuffer.indexOf('\n')) !== -1) {
            const line = outputBuffer.substring(0, newlineIndex).trim();
            outputBuffer = outputBuffer.substring(newlineIndex + 1);

            if (!line) continue;

            if (line.startsWith('info')) {
                const matchPv = line.match(/ pv (.+)/);
                if (matchPv) {
                    const moves = matchPv[1].split(' ');
                    if (moves.length > 0) {
                        candidateMoves.push(moves[0]);
                    }
                }
                const matchScore = line.match(/score (cp|mate) (-?\d+)/);
                const matchDepth = line.match(/depth (\d+)/);
                const matchNodes = line.match(/nodes (\d+)/);
                const matchNps = line.match(/nps (\d+)/);
                const matchtbhits = line.match(/tbhits (\d+)/);
                const parsedOutput = {
                    type: 'info',
                    raw: line,
                    score: matchScore ? { type: matchScore[1], value: parseInt(matchScore[2], 10) } : null,
                    pv: matchPv ? matchPv[1].split(' ') : [],
                    depth: matchDepth ? parseInt(matchDepth[1], 10) : null,
                    nodes: matchNodes ? parseInt(matchNodes[1], 10) : null,
                    nps: matchNps ? parseInt(matchNps[1], 10) : null,
                    tbhits: matchtbhits ? parseInt(matchtbhits[1], 10) : null,
                };
                io.emit('stockfish_output', parsedOutput);
                console.log(`[Backend] Emitted info: ${JSON.stringify(parsedOutput)}`);
            } else if (line.startsWith('bestmove')) {
                console.log(`[Backend] Detected bestmove line: ${line}`);
                const parts = line.split(' ');
                const bestMove = parts[1];
                console.log(`[Backend] Emitting bestmove: ${bestMove}`);
                io.emit('stockfish_output', { type: 'bestmove', move: bestMove, fen: currentFenForAnalysis });
            }
        }
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

    stockfishProcess.stdin.write(`uci
`);
    console.log('[Backend] Setting Syzygy tablebase options...');
    stockfishProcess.stdin.write(`setoption name SyzygyPath value ../syzygy_tablebases/3-4-5 2022
`);
    stockfishProcess.stdin.write(`setoption name SyzygyProbeDepth value 1
`);
    stockfishProcess.stdin.write(`setoption name Syzygy50MoveRule value true
`);
    stockfishProcess.stdin.write(`isready
`);}let currentFenForAnalysis = ''; // Initialize currentFenForAnalysis

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

app.post('/api/select-engine', (req, res) => {
    const { engineName } = req.body;
    const newEnginePath = path.resolve(ENGINES_DIR, engineName);

    try {
        const safePath = fs.realpathSync(newEnginePath);
        if (!safePath.startsWith(ENGINES_DIR) || !fs.existsSync(safePath)) {
            return res.status(400).send({ message: 'Engine not found or invalid path.' });
        }
        currentEnginePath = safePath;
    } catch (e) {
        return res.status(400).send({ message: 'Invalid engine path.' });
    }

    currentEnginePath = newEnginePath;

    if (stockfishProcess) {
        stockfishProcess.kill();
    }

    startStockfish();

    res.send({ message: `Engine changed to ${engineName}` });
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