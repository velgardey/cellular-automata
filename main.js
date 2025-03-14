class CellularAutomata {
    constructor(width, height, wallDensity, neighborThreshold) {
        this.width = width;
        this.height = height;
        this.wallDensity = wallDensity;
        this.neighborThreshold = neighborThreshold;
        this.grid = this.initializeGrid();
    }

    initializeGrid() {
        return Array.from({ length: this.height }, () =>
            Array.from({ length: this.width }, () =>
                Math.random() < (this.wallDensity / 100) ? 1 : 0
            )
        );
    }

    countNeighbors(x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const newX = x + dx;
                const newY = y + dy;
                if (newX >= 0 && newX < this.width && newY >= 0 && newY < this.height) {
                    count += this.grid[newY][newX];
                }
            }
        }
        return count;
    }

    step() {
        const newGrid = Array.from({ length: this.height }, () =>
            Array(this.width).fill(0)
        );

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const neighbors = this.countNeighbors(x, y);
                // Adjust threshold based on current cell state
                const currentThreshold = this.grid[y][x] === 1 ? 
                    this.neighborThreshold - 1 : // Lower threshold for existing walls
                    this.neighborThreshold;      // Higher threshold for new walls
                newGrid[y][x] = neighbors >= currentThreshold ? 1 : 0;
            }
        }

        this.grid = newGrid;
    }
}

class CaveVisualizer {
    constructor() {
        this.canvas = document.getElementById('caCanvas');
        this.gameCanvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameCtx = this.gameCanvas.getContext('2d');
        this.setupControls();
        this.setupCanvas();
        this.setupTouchHandling();
        this.generate();
    }

    setupCanvas() {
        const containerWidth = this.canvas.parentElement.clientWidth;
        const containerHeight = window.innerHeight;
        const maxSize = Math.min(containerWidth - 32, 400);
        const minSize = 200; // Minimum size for mobile
        const size = Math.max(minSize, maxSize);
        
        // Set canvas size with device pixel ratio for sharp rendering
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.gameCanvas.width = size * dpr;
        this.gameCanvas.height = size * dpr;
        
        // Scale context to match device pixel ratio
        this.ctx.scale(dpr, dpr);
        this.gameCtx.scale(dpr, dpr);
        
        this.cellSize = size / this.gridSize;
    }

    setupTouchHandling() {
        // Prevent default touch behaviors
        this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        this.gameCanvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        
        // Add touch event listeners for both canvases
        [this.canvas, this.gameCanvas].forEach(canvas => {
            canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
            canvas.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
        });
    }

    setupControls() {
        this.gridSize = parseInt(document.getElementById('gridSize').value);
        this.wallDensity = parseInt(document.getElementById('wallDensity').value);
        this.iterations = parseInt(document.getElementById('iterations').value);
        this.neighborThreshold = parseInt(document.getElementById('neighborThreshold').value);

        // Setup event listeners with touch support
        const setupRangeInput = (id, suffix = '') => {
            const input = document.getElementById(id);
            const valueDisplay = document.getElementById(id + 'Value');
            
            const updateValue = (value) => {
                valueDisplay.textContent = value + suffix;
                this[id.replace('Value', '')] = parseInt(value);
                this.generate(); // Generate on every change
            };

            // Prevent text selection during touch
            input.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                e.preventDefault();
            }, { passive: false });

            input.addEventListener('input', (e) => updateValue(e.target.value));
            
            // Improved touch handling for range inputs
            input.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const rect = input.getBoundingClientRect();
                const value = ((touch.clientX - rect.left) / rect.width) * 
                    (parseInt(input.max) - parseInt(input.min)) + parseInt(input.min);
                input.value = Math.round(value);
                updateValue(input.value);
            }, { passive: false });
        };

        setupRangeInput('gridSize');
        setupRangeInput('wallDensity', '%');
        setupRangeInput('iterations');
        setupRangeInput('neighborThreshold');

        // Handle window resize with debounce
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.setupCanvas();
                this.draw();
            }, 250); // Debounce resize events
        });
    }

    generate() {
        this.ca = new CellularAutomata(
            this.gridSize,
            this.gridSize,
            this.wallDensity,
            this.neighborThreshold
        );

        // Run iterations
        for (let i = 0; i < this.iterations; i++) {
            this.ca.step();
        }

        this.draw();
    }

    draw() {
        // Clear both canvases
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.gameCtx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);

        // Draw cellular automata grid
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.ca.grid[y][x] === 1) {
                    // Color based on neighbor count for better visualization
                    const neighbors = this.ca.countNeighbors(x, y);
                    const intensity = Math.min(255, 128 + (neighbors * 32));
                    this.ctx.fillStyle = `rgb(74, ${intensity}, 255)`;
                    this.ctx.fillRect(
                        x * this.cellSize,
                        y * this.cellSize,
                        this.cellSize,
                        this.cellSize
                    );
                }
            }
        }

        // Draw game-level visualization with perspective
        const perspective = 0.7;
        const wallHeight = this.cellSize * 2;
        const floorColor = '#2a2a2a';
        const wallColor = '#1a1a1a';
        const highlightColor = 'rgba(255, 255, 255, 0.1)';
        const shadowColor = 'rgba(0, 0, 0, 0.3)';

        // Draw floor
        this.gameCtx.fillStyle = floorColor;
        this.gameCtx.fillRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);

        // Draw walls and floor tiles
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.ca.grid[y][x];
                const screenX = x * this.cellSize;
                const screenY = y * this.cellSize;

                if (cell === 1) {
                    // Calculate wall color based on neighbor count
                    const neighbors = this.ca.countNeighbors(x, y);
                    const wallIntensity = Math.max(0, Math.min(1, neighbors / 8));
                    const wallColor = `rgb(${26 + wallIntensity * 20}, ${26 + wallIntensity * 20}, ${26 + wallIntensity * 20})`;

                    // Draw wall
                    this.gameCtx.fillStyle = wallColor;
                    this.gameCtx.fillRect(
                        screenX,
                        screenY - wallHeight * perspective,
                        this.cellSize,
                        wallHeight
                    );

                    // Add wall highlights
                    this.gameCtx.fillStyle = highlightColor;
                    this.gameCtx.fillRect(
                        screenX,
                        screenY - wallHeight * perspective,
                        this.cellSize,
                        2
                    );
                    this.gameCtx.fillRect(
                        screenX,
                        screenY - wallHeight * perspective,
                        2,
                        wallHeight
                    );

                    // Add wall shadows
                    this.gameCtx.fillStyle = shadowColor;
                    this.gameCtx.fillRect(
                        screenX + this.cellSize - 2,
                        screenY - wallHeight * perspective,
                        2,
                        wallHeight
                    );
                    this.gameCtx.fillRect(
                        screenX,
                        screenY - wallHeight * perspective + wallHeight - 2,
                        this.cellSize,
                        2
                    );
                }

                // Draw floor tile with intensity based on neighbor count
                const neighbors = this.ca.countNeighbors(x, y);
                const floorIntensity = Math.max(0, Math.min(1, neighbors / 8));
                this.gameCtx.fillStyle = cell === 1 ? 
                    shadowColor : 
                    `rgba(255, 255, 255, ${0.05 + floorIntensity * 0.05})`;
                this.gameCtx.fillRect(
                    screenX,
                    screenY,
                    this.cellSize,
                    this.cellSize
                );
            }
        }

        // Add ambient lighting effect
        const gradient = this.gameCtx.createRadialGradient(
            this.gameCanvas.width / 2,
            this.gameCanvas.height / 2,
            0,
            this.gameCanvas.width / 2,
            this.gameCanvas.height / 2,
            this.gameCanvas.width / 2
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        this.gameCtx.fillStyle = gradient;
        this.gameCtx.fillRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
    }
}

// Initialize the visualizer when the page loads
window.addEventListener('load', () => {
    new CaveVisualizer();
});
