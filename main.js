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
        
        // Handle resize events properly
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('orientationchange', this.handleResize);
    }
    
    handleResize() {
        // Clear any existing timeout
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        // Set a timeout to prevent multiple resize events
        this.resizeTimeout = setTimeout(() => {
            this.setupCanvas();
            this.draw();
        }, 250);
    }

    setupCanvas() {
        // Get the actual container width after CSS is applied
        const containerWidth = this.canvas.parentElement.clientWidth;
        
        // Set fixed height for canvas based on CSS
        const canvasHeight = window.matchMedia('(max-width: 768px)').matches ? 200 : 250;
        
        // Set canvas size with device pixel ratio for sharp rendering
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = containerWidth * dpr;
        this.canvas.height = canvasHeight * dpr;
        this.gameCanvas.width = containerWidth * dpr;
        this.gameCanvas.height = canvasHeight * dpr;
        
        // Scale context to match device pixel ratio
        this.ctx.scale(dpr, dpr);
        this.gameCtx.scale(dpr, dpr);
        
        // Adjust cell size based on grid size and canvas dimensions
        const displayWidth = containerWidth;
        const displayHeight = canvasHeight;
        this.cellSize = Math.min(displayWidth, displayHeight) / this.gridSize;
        
        // Apply CSS dimensions to match the canvas size
        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${canvasHeight}px`;
        this.gameCanvas.style.width = `${displayWidth}px`;
        this.gameCanvas.style.height = `${canvasHeight}px`;
    }

    setupTouchHandling() {
        // Enhanced touch handling for sliders
        const sliders = document.querySelectorAll('input[type="range"]');
        
        sliders.forEach(slider => {
            // Prevent propagation of touch events from sliders
            slider.addEventListener('touchstart', e => {
                e.stopPropagation();
            }, { passive: false });
            
            slider.addEventListener('touchmove', e => {
                e.stopPropagation();
            }, { passive: false });
        });
        
        // Prevent default touch behaviors on canvases
        [this.canvas, this.gameCanvas].forEach(canvas => {
            canvas.addEventListener('touchstart', e => {
                e.preventDefault();
                e.stopPropagation();
            }, { passive: false });
            
            canvas.addEventListener('touchmove', e => {
                e.preventDefault();
                e.stopPropagation();
            }, { passive: false });
            
            canvas.addEventListener('touchend', e => {
                e.preventDefault();
                e.stopPropagation();
            }, { passive: false });
        });
    }

    setupControls() {
        this.gridSize = parseInt(document.getElementById('gridSize').value);
        this.wallDensity = parseInt(document.getElementById('wallDensity').value);
        this.iterations = parseInt(document.getElementById('iterations').value);
        this.neighborThreshold = parseInt(document.getElementById('neighborThreshold').value);

        // Setup event listeners with enhanced touch support
        const setupRangeInput = (id, suffix = '') => {
            const input = document.getElementById(id);
            const valueDisplay = document.getElementById(id + 'Value');
            
            const updateValue = (value) => {
                // Ensure value is within min/max bounds
                const min = parseInt(input.min);
                const max = parseInt(input.max);
                value = Math.max(min, Math.min(max, parseInt(value)));
                
                // Update display and internal state
                valueDisplay.textContent = value + suffix;
                
                // Map the id to the correct property name
                const propertyMap = {
                    'gridSize': 'gridSize',
                    'wallDensity': 'wallDensity',
                    'iterations': 'iterations',
                    'neighborThreshold': 'neighborThreshold'
                };
                
                this[propertyMap[id]] = parseInt(value);
                
                // Generate with a small debounce for performance on mobile
                if (this.generateTimeout) clearTimeout(this.generateTimeout);
                this.generateTimeout = setTimeout(() => this.generate(), 10);
            };

            // Improved touch handling for all devices
            const handleTouch = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const touch = e.touches[0];
                const rect = input.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
                const min = parseInt(input.min);
                const max = parseInt(input.max);
                const value = Math.round(min + ratio * (max - min));
                
                // Update input value and trigger change
                input.value = value;
                updateValue(value);
                
                // Add visual feedback
                input.classList.add('active');
            };
            
            // Standard input event for all devices
            input.addEventListener('input', (e) => {
                updateValue(e.target.value);
                input.classList.add('active');
            });
            
            // Touch-specific events with passive: false for better mobile performance
            input.addEventListener('touchstart', handleTouch, { passive: false });
            input.addEventListener('touchmove', handleTouch, { passive: false });
            
            // Remove active state when interaction ends
            const endInteraction = () => {
                input.classList.remove('active');
            };
            
            input.addEventListener('touchend', endInteraction);
            input.addEventListener('touchcancel', endInteraction);
            input.addEventListener('mouseup', endInteraction);
            input.addEventListener('mouseleave', endInteraction);
        };

        setupRangeInput('gridSize');
        setupRangeInput('wallDensity', '%');
        setupRangeInput('iterations');
        setupRangeInput('neighborThreshold');
        
        // Initial setup for mobile devices
        if (window.matchMedia('(max-width: 768px)').matches) {
            this.setupCanvas();
        }
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
    // Prevent default touch behavior on the entire document
    document.addEventListener('touchmove', function(e) {
        e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('touchstart', function(e) {
        // Allow touch events only on sliders and the container for scrolling
        if (!e.target.closest('input[type="range"]') && 
            !e.target.closest('.container')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Prevent scrolling when touching the canvas
    document.querySelectorAll('canvas').forEach(canvas => {
        canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
        canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
        canvas.addEventListener('touchend', e => e.preventDefault(), { passive: false });
    });
    
    // Handle iOS Safari specific issues
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
        document.addEventListener('gesturestart', function(e) {
            e.preventDefault(); // Disable pinch zoom
        }, { passive: false });
        
        // Fix for iOS momentum scrolling
        document.querySelector('.container').style.webkitOverflowScrolling = 'touch';
    }
    
    // Initialize the visualizer
    new CaveVisualizer();
});
