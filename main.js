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
        const size = Math.min(containerWidth, 300); // Match max-width from CSS
        
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
        
        // Store the logical canvas size for use in drawing
        this.canvasLogicalWidth = size;
        this.canvasLogicalHeight = size;
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
                
                // Directly update the corresponding property
                if (id === 'gridSize') {
                    this.gridSize = parseInt(value);
                    // When grid size changes, we need to recalculate cell size
                    this.setupCanvas();
                } else if (id === 'wallDensity') {
                    this.wallDensity = parseInt(value);
                } else if (id === 'iterations') {
                    this.iterations = parseInt(value);
                } else if (id === 'neighborThreshold') {
                    this.neighborThreshold = parseInt(value);
                }
                
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

        // Draw game-level visualization with isometric perspective
        this.drawIsometricGameView();
    }

    drawIsometricGameView() {
        const gameCtx = this.gameCtx;
        const width = this.canvasLogicalWidth; // Use logical width instead of canvas.width
        const height = this.canvasLogicalHeight; // Use logical height instead of canvas.height
        
        // Debug option - set to true to see centering guides
        const showDebugGuides = false;
        
        // Clear the canvas with background color
        gameCtx.fillStyle = '#1a1a1a';
        gameCtx.fillRect(0, 0, width, height);
        
        // Calculate the optimal tile size based on grid size and canvas dimensions
        // We want to ensure the entire grid fits within the canvas with proper margins
        const maxGridDimension = Math.max(this.gridSize, 20); // Ensure minimum grid dimension
        
        // Calculate the divisor to fit the grid properly
        // For larger grids, we need a smaller tile size to fit everything
        // The 0.85 factor provides a small margin around the grid
        const divisor = maxGridDimension * 0.85;
        
        // Calculate tile dimensions - maintain 2:1 ratio for isometric tiles
        const tileWidth = Math.min(width, height) / divisor;
        const tileHeight = tileWidth * 0.5;
        const wallHeight = tileHeight * 1.0;
        
        // Calculate the total width and height of the isometric grid in pixels
        // For an isometric grid, the total width and height depend on both dimensions
        const isoGridWidth = this.gridSize * tileWidth;
        const isoGridHeight = this.gridSize * tileHeight;
        
        // Calculate offsets to center the grid in the canvas
        // Horizontal centering is straightforward - just use half the canvas width
        const offsetX = width / 2;
        
        // Vertical centering requires an adjustment factor due to the diamond shape
        // This factor is empirically determined for best visual centering
        // The adjustment factor is based on the grid size and aspect ratio
        let verticalAdjustFactor;
        
        // Adjust the vertical centering factor based on grid size
        // These values were determined through testing to achieve optimal centering
        if (this.gridSize > 60) {
            verticalAdjustFactor = 0.32; // Larger adjustment for very large grids
        } else if (this.gridSize > 40) {
            verticalAdjustFactor = 0.28; // Medium adjustment for large grids
        } else if (this.gridSize > 20) {
            verticalAdjustFactor = 0.24; // Standard adjustment for medium grids
        } else {
            verticalAdjustFactor = 0.20; // Smaller adjustment for small grids
        }
        
        const verticalAdjustment = isoGridHeight * verticalAdjustFactor;
        const offsetY = height / 2 - verticalAdjustment;
        
        // Colors with improved palette
        const floorColor = '#2d2d2d';
        const floorHighlight = '#3a3a3a';
        const waterColor = '#1976D2';
        const waterHighlight = '#2196F3';
        const waterDeep = '#0D47A1';
        
        // Draw background/sky with improved gradient
        const skyGradient = gameCtx.createLinearGradient(0, 0, 0, height);
        skyGradient.addColorStop(0, '#0a0a0a');
        skyGradient.addColorStop(0.5, '#1a1a1a');
        skyGradient.addColorStop(1, '#2d2d2d');
        gameCtx.fillStyle = skyGradient;
        gameCtx.fillRect(0, 0, width, height);
        
        // Add some stars/distant lights to the background
        gameCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        const starCount = 50;
        for (let i = 0; i < starCount; i++) {
            const size = Math.random() * 1.5;
            const x = Math.random() * width;
            const y = Math.random() * height * 0.5;
            const opacity = Math.random() * 0.5 + 0.1;
            gameCtx.globalAlpha = opacity;
            gameCtx.beginPath();
            gameCtx.arc(x, y, size, 0, Math.PI * 2);
            gameCtx.fill();
        }
        gameCtx.globalAlpha = 1.0;
        
        // Function to convert grid coordinates to isometric screen coordinates
        const toIso = (x, y) => {
            return {
                x: offsetX + (x - y) * tileWidth / 2,
                y: offsetY + (x + y) * tileHeight / 2
            };
        };
        
        // Draw a border around the isometric grid area for debugging centering
        if (showDebugGuides) {
            // Draw canvas center
            gameCtx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
            gameCtx.lineWidth = 1;
            gameCtx.beginPath();
            gameCtx.moveTo(width/2 - 10, height/2);
            gameCtx.lineTo(width/2 + 10, height/2);
            gameCtx.moveTo(width/2, height/2 - 10);
            gameCtx.lineTo(width/2, height/2 + 10);
            gameCtx.stroke();
            
            // Draw isometric grid outline
            gameCtx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
            
            // Calculate the corners of the isometric grid
            const topLeft = toIso(0, 0);
            const topRight = toIso(this.gridSize-1, 0);
            const bottomLeft = toIso(0, this.gridSize-1);
            const bottomRight = toIso(this.gridSize-1, this.gridSize-1);
            
            gameCtx.beginPath();
            gameCtx.moveTo(topLeft.x, topLeft.y);
            gameCtx.lineTo(topRight.x, topRight.y);
            gameCtx.lineTo(bottomRight.x, bottomRight.y);
            gameCtx.lineTo(bottomLeft.x, bottomLeft.y);
            gameCtx.closePath();
            gameCtx.stroke();
            
            // Draw grid center
            const gridCenterX = (topLeft.x + bottomRight.x) / 2;
            const gridCenterY = (topLeft.y + bottomRight.y) / 2;
            
            gameCtx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
            gameCtx.beginPath();
            gameCtx.moveTo(gridCenterX - 10, gridCenterY);
            gameCtx.lineTo(gridCenterX + 10, gridCenterY);
            gameCtx.moveTo(gridCenterX, gridCenterY - 10);
            gameCtx.lineTo(gridCenterX, gridCenterY + 10);
            gameCtx.stroke();
        }
        
        // Draw floor tiles first (back to front for proper layering)
        for (let y = this.gridSize - 1; y >= 0; y--) {
            for (let x = 0; x < this.gridSize; x++) {
                const iso = toIso(x, y);
                
                // Skip walls for now, we'll draw them later
                if (this.ca.grid[y][x] === 1) continue;
                
                // Draw floor tile (diamond shape)
                gameCtx.beginPath();
                gameCtx.moveTo(iso.x, iso.y);
                gameCtx.lineTo(iso.x + tileWidth/2, iso.y + tileHeight/2);
                gameCtx.lineTo(iso.x, iso.y + tileHeight);
                gameCtx.lineTo(iso.x - tileWidth/2, iso.y + tileHeight/2);
                gameCtx.closePath();
                
                // Determine if this is a water tile (based on neighbor count)
                    const neighbors = this.ca.countNeighbors(x, y);
                const isWater = neighbors >= 6;
                
                if (isWater) {
                    // Water tile with animated effect
                    const time = Date.now() / 1000;
                    const waveOffset = Math.sin(time + x * 0.3 + y * 0.3) * 0.1;
                    
                    // Create water gradient
                    const waterGradient = gameCtx.createLinearGradient(
                        iso.x - tileWidth/2, iso.y + tileHeight/2,
                        iso.x + tileWidth/2, iso.y + tileHeight/2
                    );
                    waterGradient.addColorStop(0, waterDeep);
                    waterGradient.addColorStop(0.5 + waveOffset, waterColor);
                    waterGradient.addColorStop(1, waterDeep);
                    
                    gameCtx.fillStyle = waterGradient;
                    gameCtx.fill();
                    
                    // Add water highlight/reflection
                    gameCtx.fillStyle = waterHighlight;
                    gameCtx.globalAlpha = 0.2 + waveOffset * 0.1;
                    gameCtx.beginPath();
                    gameCtx.moveTo(iso.x, iso.y + tileHeight * 0.3);
                    gameCtx.lineTo(iso.x + tileWidth/4, iso.y + tileHeight/2);
                    gameCtx.lineTo(iso.x, iso.y + tileHeight * 0.7);
                    gameCtx.lineTo(iso.x - tileWidth/4, iso.y + tileHeight/2);
                    gameCtx.closePath();
                    gameCtx.fill();
                    gameCtx.globalAlpha = 1.0;
                } else {
                    // Regular floor tile with subtle pattern based on position
                    const brightness = 0.8 + ((x + y) % 2) * 0.2;
                    gameCtx.fillStyle = `rgb(${Math.floor(45 * brightness)}, ${Math.floor(45 * brightness)}, ${Math.floor(45 * brightness)})`;
                    gameCtx.fill();
                    
                    // Add subtle grid pattern
                    gameCtx.strokeStyle = floorHighlight;
                    gameCtx.lineWidth = 0.5;
                    gameCtx.stroke();
                }
            }
        }
        
        // Now draw walls (back to front for proper layering)
        for (let y = this.gridSize - 1; y >= 0; y--) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.ca.grid[y][x] !== 1) continue;
                
                const iso = toIso(x, y);
                
                // Determine wall color based on neighbor count for variety
                const neighbors = this.ca.countNeighbors(x, y);
                const colorIntensity = Math.min(1, neighbors / 8);
                
                // Adjust wall colors based on neighbor count
                const r = Math.floor(76 + colorIntensity * 20);
                const g = Math.floor(175 + colorIntensity * 20);
                const b = Math.floor(80 + colorIntensity * 20);
                const wallColor = `rgb(${r}, ${g}, ${b})`;
                const wallTopColorCustom = `rgb(${r-20}, ${g-20}, ${b-20})`;
                const wallSideColorCustom = `rgb(${r-40}, ${g-40}, ${b-40})`;
                
                // Check if adjacent cells are walls to determine which sides to draw
                const hasWallAbove = y > 0 && this.ca.grid[y-1][x] === 1;
                const hasWallRight = x < this.gridSize-1 && this.ca.grid[y][x+1] === 1;
                const hasWallBelow = y < this.gridSize-1 && this.ca.grid[y+1][x] === 1;
                const hasWallLeft = x > 0 && this.ca.grid[y][x-1] === 1;
                
                // Draw wall top (slightly smaller than floor tile)
                gameCtx.beginPath();
                gameCtx.moveTo(iso.x, iso.y - wallHeight);
                gameCtx.lineTo(iso.x + tileWidth/2, iso.y + tileHeight/2 - wallHeight);
                gameCtx.lineTo(iso.x, iso.y + tileHeight - wallHeight);
                gameCtx.lineTo(iso.x - tileWidth/2, iso.y + tileHeight/2 - wallHeight);
                gameCtx.closePath();
                
                // Create gradient for top of wall
                const topGradient = gameCtx.createLinearGradient(
                    iso.x, iso.y - wallHeight,
                    iso.x, iso.y + tileHeight - wallHeight
                );
                topGradient.addColorStop(0, wallTopColorCustom);
                topGradient.addColorStop(1, `rgb(${r-30}, ${g-30}, ${b-30})`);
                
                gameCtx.fillStyle = topGradient;
                gameCtx.fill();
                
                // Add subtle grid to top
                gameCtx.strokeStyle = `rgba(255, 255, 255, 0.1)`;
                gameCtx.lineWidth = 0.5;
                gameCtx.stroke();
                
                // Draw right side of wall if visible
                if (!hasWallRight) {
                    gameCtx.beginPath();
                    gameCtx.moveTo(iso.x + tileWidth/2, iso.y + tileHeight/2 - wallHeight);
                    gameCtx.lineTo(iso.x, iso.y + tileHeight - wallHeight);
                    gameCtx.lineTo(iso.x, iso.y + tileHeight);
                    gameCtx.lineTo(iso.x + tileWidth/2, iso.y + tileHeight/2);
                    gameCtx.closePath();
                    
                    // Create gradient for side of wall
                    const rightGradient = gameCtx.createLinearGradient(
                        iso.x + tileWidth/2, iso.y + tileHeight/2 - wallHeight,
                        iso.x, iso.y + tileHeight
                    );
                    rightGradient.addColorStop(0, wallSideColorCustom);
                    rightGradient.addColorStop(1, `rgb(${r-50}, ${g-50}, ${b-50})`);
                    
                    gameCtx.fillStyle = rightGradient;
                    gameCtx.fill();
                    
                    // Add subtle edge highlight
                    gameCtx.strokeStyle = `rgba(255, 255, 255, 0.05)`;
                    gameCtx.lineWidth = 0.5;
                    gameCtx.stroke();
                }
                
                // Draw left side of wall if visible
                if (!hasWallLeft) {
                    gameCtx.beginPath();
                    gameCtx.moveTo(iso.x, iso.y + tileHeight - wallHeight);
                    gameCtx.lineTo(iso.x - tileWidth/2, iso.y + tileHeight/2 - wallHeight);
                    gameCtx.lineTo(iso.x - tileWidth/2, iso.y + tileHeight/2);
                    gameCtx.lineTo(iso.x, iso.y + tileHeight);
                    gameCtx.closePath();
                    
                    // Create gradient for side of wall
                    const leftGradient = gameCtx.createLinearGradient(
                        iso.x - tileWidth/2, iso.y + tileHeight/2 - wallHeight,
                        iso.x, iso.y + tileHeight
                    );
                    leftGradient.addColorStop(0, wallColor);
                    leftGradient.addColorStop(1, wallSideColorCustom);
                    
                    gameCtx.fillStyle = leftGradient;
                    gameCtx.fill();
                    
                    // Add subtle edge highlight
                    gameCtx.strokeStyle = `rgba(255, 255, 255, 0.1)`;
                    gameCtx.lineWidth = 0.5;
                    gameCtx.stroke();
                }
            }
        }
        
        // Add a character/player marker at a random walkable position
        this.addPlayerMarker(gameCtx, toIso);
        
        // Add ambient lighting/fog effect
        const gradient = gameCtx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, width / 1.2
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        gameCtx.fillStyle = gradient;
        gameCtx.fillRect(0, 0, width, height);
        
        // Add some particles/dust for atmosphere
        gameCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 30; i++) {
            const size = Math.random() * 2 + 0.5;
            const x = Math.random() * width;
            const y = Math.random() * height * 0.7;
            const opacity = Math.random() * 0.3 + 0.1;
            gameCtx.globalAlpha = opacity;
            gameCtx.beginPath();
            gameCtx.arc(x, y, size, 0, Math.PI * 2);
            gameCtx.fill();
        }
        gameCtx.globalAlpha = 1.0;
    }
    
    // Add a player character to the game view
    addPlayerMarker(gameCtx, toIso) {
        // Find a walkable position for the player (not a wall)
        let playerX, playerY;
        let attempts = 0;
        const maxAttempts = 100;
        
        do {
            playerX = Math.floor(Math.random() * this.gridSize);
            playerY = Math.floor(Math.random() * this.gridSize);
            attempts++;
        } while (this.ca.grid[playerY][playerX] === 1 && attempts < maxAttempts);
        
        // If we couldn't find a walkable position, just return
        if (attempts >= maxAttempts) return;
        
        // Convert to isometric coordinates
        const iso = toIso(playerX, playerY);
        
        // Draw player shadow
        gameCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        gameCtx.beginPath();
        gameCtx.ellipse(iso.x, iso.y + 5, 8, 4, 0, 0, Math.PI * 2);
        gameCtx.fill();
        
        // Draw player body
        const playerGradient = gameCtx.createLinearGradient(
            iso.x - 5, iso.y - 15,
            iso.x + 5, iso.y
        );
        playerGradient.addColorStop(0, '#FF5722');
        playerGradient.addColorStop(1, '#E64A19');
        
        gameCtx.fillStyle = playerGradient;
        gameCtx.beginPath();
        gameCtx.arc(iso.x, iso.y - 8, 5, 0, Math.PI * 2);
        gameCtx.fill();
        
        // Draw player head
        gameCtx.fillStyle = '#FFA726';
        gameCtx.beginPath();
        gameCtx.arc(iso.x, iso.y - 15, 3, 0, Math.PI * 2);
        gameCtx.fill();
        
        // Add a subtle glow around the player
        const glowGradient = gameCtx.createRadialGradient(
            iso.x, iso.y - 8, 0,
            iso.x, iso.y - 8, 15
        );
        glowGradient.addColorStop(0, 'rgba(255, 160, 0, 0.3)');
        glowGradient.addColorStop(1, 'rgba(255, 160, 0, 0)');
        
        gameCtx.fillStyle = glowGradient;
        gameCtx.beginPath();
        gameCtx.arc(iso.x, iso.y - 8, 15, 0, Math.PI * 2);
        gameCtx.fill();
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
