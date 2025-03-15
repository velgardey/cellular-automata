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
        
        // Calculate size for 1:1 aspect ratio
        const size = Math.min(containerWidth, 350); // Limit max size
        
        // Set canvas size with device pixel ratio for sharp rendering
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.gameCanvas.width = size * dpr;
        this.gameCanvas.height = size * dpr;
        
        // Scale context to match device pixel ratio
        this.ctx.scale(dpr, dpr);
        this.gameCtx.scale(dpr, dpr);
        
        // Adjust cell size based on grid size and canvas dimensions
        this.cellSize = size / this.gridSize;
        
        // Apply CSS dimensions to match the canvas size
        this.canvas.style.width = `${size}px`;
        this.canvas.style.height = `${size}px`;
        this.gameCanvas.style.width = `${size}px`;
        this.gameCanvas.style.height = `${size}px`;
    }

    setupTouchHandling() {
        // Allow scrolling when touching canvases, but prevent unwanted interactions
        [this.canvas, this.gameCanvas].forEach(canvas => {
            // Only prevent default for actual drawing/interaction attempts
            // but allow scrolling gestures to pass through
            canvas.addEventListener('touchstart', e => {
                // Check if it's a single touch (likely a scroll attempt)
                if (e.touches.length === 1) {
                    // Store initial touch position to determine if it's a scroll
                    this.touchStartY = e.touches[0].clientY;
                } else {
                    // Multi-touch gestures should be prevented
                    e.preventDefault();
                }
            }, { passive: true }); // Use passive listener to improve scrolling performance
            
            canvas.addEventListener('touchmove', e => {
                if (e.touches.length === 1 && this.touchStartY !== undefined) {
                    // Calculate vertical movement
                    const touchY = e.touches[0].clientY;
                    const deltaY = Math.abs(touchY - this.touchStartY);
                    
                    // If vertical movement is significant, it's likely a scroll attempt
                    // Only prevent default for horizontal or minimal movement (likely drawing)
                    if (deltaY < 10) {
                        e.preventDefault();
                    }
                } else {
                    e.preventDefault();
                }
            }, { passive: false });
            
            canvas.addEventListener('touchend', () => {
                // Clean up the stored touch position
                delete this.touchStartY;
            });
        });
        
        // Fix for iOS Safari
        if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
            // Add specific handling for iOS sliders
            document.querySelectorAll('input[type="range"]').forEach(slider => {
                // iOS needs special handling for sliders
                slider.addEventListener('touchstart', e => {
                    e.stopPropagation();
                }, { passive: true });
            });
        }
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

            // Direct value update for mouse/touch position
            const updateValueFromPosition = (clientX) => {
                const rect = input.getBoundingClientRect();
                const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
                const min = parseInt(input.min);
                const max = parseInt(input.max);
                const value = Math.round(min + percentage * (max - min));
                
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
            
            // Mouse events for better desktop handling
            input.addEventListener('mousedown', (e) => {
                // Update on initial click
                updateValueFromPosition(e.clientX);
                
                // Setup mouse move and up handlers
                const handleMouseMove = (moveEvent) => {
                    updateValueFromPosition(moveEvent.clientX);
                };
                
                const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                    input.classList.remove('active');
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            });
            
            // Touch events with improved handling
            input.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevent scrolling when touching slider
                updateValueFromPosition(e.touches[0].clientX);
                
                // Setup touch move and end handlers
                const handleTouchMove = (moveEvent) => {
                    moveEvent.preventDefault();
                    updateValueFromPosition(moveEvent.touches[0].clientX);
                };
                
                const handleTouchEnd = () => {
                    document.removeEventListener('touchmove', handleTouchMove);
                    document.removeEventListener('touchend', handleTouchEnd);
                    document.removeEventListener('touchcancel', handleTouchEnd);
                    input.classList.remove('active');
                };
                
                document.addEventListener('touchmove', handleTouchMove, { passive: false });
                document.addEventListener('touchend', handleTouchEnd);
                document.addEventListener('touchcancel', handleTouchEnd);
            }, { passive: false });
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
    // Fix for iOS Safari specific issues
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
        document.addEventListener('gesturestart', function(e) {
            // Only prevent zoom on canvas elements
            if (e.target.tagName.toLowerCase() === 'canvas') {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Fix for iOS momentum scrolling
        document.querySelector('.container').style.webkitOverflowScrolling = 'touch';
        
        // Additional iOS-specific fixes for scrolling
        document.addEventListener('touchmove', function(e) {
            // Allow default scrolling behavior
        }, { passive: true });
    }
    
    // Ensure sliders work properly on all devices
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        // Fix for Firefox and some mobile browsers
        slider.addEventListener('input', function() {
            // Trigger a change event to ensure value updates
            const event = new Event('change', { bubbles: true });
            this.dispatchEvent(event);
        });
        
        // Special handling for the threshold slider
        if (slider.id === 'neighborThreshold') {
            // Add extra handling for this specific slider
            slider.addEventListener('touchstart', function(e) {
                // Ensure this slider gets priority
                e.stopPropagation();
                slider.style.zIndex = '30';
            }, { passive: true });
            
            slider.addEventListener('touchend', function() {
                // Reset z-index after interaction
                setTimeout(() => {
                    slider.style.zIndex = '15';
                }, 300);
            });
        }
    });
    
    // Add a global touch handler to help with scrolling
    let touchStartY = 0;
    let scrolling = false;
    
    document.addEventListener('touchstart', function(e) {
        // Store the initial touch position
        touchStartY = e.touches[0].clientY;
        scrolling = false;
    }, { passive: true });
    
    document.addEventListener('touchmove', function(e) {
        // Calculate vertical movement
        const touchY = e.touches[0].clientY;
        const deltaY = touchY - touchStartY;
        
        // If significant vertical movement, mark as scrolling
        if (Math.abs(deltaY) > 10) {
            scrolling = true;
        }
        
        // Don't prevent default to allow scrolling
    }, { passive: true });
    
    // Initialize the visualizer
    new CaveVisualizer();
});
