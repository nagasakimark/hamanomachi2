// Game configuration and main game scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.player = null;
        this.cursors = null;
        this.gridSize = 40; // Increased for better visibility at target resolution
        this.mapWidth = 20;
        this.mapHeight = 12; // Adjusted for 960x540 optimal display
        this.playerDirection = 0; // 0: right, 1: down, 2: left, 3: up
        this.isExecuting = false;
        this.executionQueue = [];
        this.currentCommand = 0;
    }

    preload() {
        // Create simple colored rectangles for the player and tiles
        this.load.image('grass', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
        this.load.image('stone', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
        
        // Create player sprite
        this.createPlayerSprite();
    }

    createPlayerSprite() {
        // Create a simple arrow-like player sprite
        const canvas = this.textures.createCanvas('player', this.gridSize, this.gridSize);
        const ctx = canvas.getContext();
        
        // Clear canvas
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(0, 0, this.gridSize, this.gridSize);
        
        // Draw arrow pointing right
        ctx.fillStyle = '#2E7D32';
        ctx.beginPath();
        ctx.moveTo(this.gridSize * 0.8, this.gridSize * 0.5);
        ctx.lineTo(this.gridSize * 0.2, this.gridSize * 0.2);
        ctx.lineTo(this.gridSize * 0.2, this.gridSize * 0.8);
        ctx.closePath();
        ctx.fill();
        
        canvas.refresh();
    }

    create() {
        // Create the game world
        this.createWorld();
        
        // Create the player
        this.createPlayer();
        
        // Set up camera with proper bounds and zoom
        this.cameras.main.setBounds(0, 0, this.mapWidth * this.gridSize, this.mapHeight * this.gridSize);
        
        // Calculate optimal zoom based on game size
        const gameWidth = this.sys.game.config.width;
        const gameHeight = this.sys.game.config.height;
        const worldWidth = this.mapWidth * this.gridSize;
        const worldHeight = this.mapHeight * this.gridSize;
        
        const zoomX = gameWidth / worldWidth;
        const zoomY = gameHeight / worldHeight;
        const optimalZoom = Math.min(zoomX, zoomY) * 0.9; // 90% to add some padding
        
        this.cameras.main.setZoom(optimalZoom);
        this.cameras.main.centerOn(worldWidth / 2, worldHeight / 2);
    }

    createWorld() {
        // Create a simple grid-based world
        this.tiles = this.add.group();
        
        for (let x = 0; x < this.mapWidth; x++) {
            for (let y = 0; y < this.mapHeight; y++) {
                const tileX = x * this.gridSize;
                const tileY = y * this.gridSize;
                
                // Create grass tile
                const tile = this.add.rectangle(
                    tileX + this.gridSize / 2, 
                    tileY + this.gridSize / 2, 
                    this.gridSize - 2, 
                    this.gridSize - 2, 
                    0x4CAF50
                );
                tile.setStrokeStyle(2, 0x2E7D32);
                this.tiles.add(tile);
                
                // Add some stone tiles as obstacles (adjusted for new map height)
                if ((x === 5 && y >= 2 && y <= 5) || 
                    (x === 10 && y >= 6 && y <= 9) ||
                    (x >= 15 && x <= 17 && y === 3)) {
                    const stone = this.add.rectangle(
                        tileX + this.gridSize / 2, 
                        tileY + this.gridSize / 2, 
                        this.gridSize - 2, 
                        this.gridSize - 2, 
                        0x607D8B
                    );
                    stone.setStrokeStyle(2, 0x37474F);
                    this.tiles.add(stone);
                    
                    // Mark as obstacle
                    stone.isObstacle = true;
                }
            }
        }
    }

    createPlayer() {
        // Create player at grid position (2, 2)
        this.playerGridX = 2;
        this.playerGridY = 2;
        
        this.player = this.add.rectangle(
            (this.playerGridX * this.gridSize) + this.gridSize / 2,
            (this.playerGridY * this.gridSize) + this.gridSize / 2,
            this.gridSize - 4,
            this.gridSize - 4,
            0x2196F3
        );
        this.player.setStrokeStyle(3, 0x1976D2);
        
        // Add direction indicator
        this.updatePlayerDirection();
    }

    updatePlayerDirection() {
        // Remove old direction indicator
        if (this.directionIndicator) {
            this.directionIndicator.destroy();
        }
        
        // Create new direction indicator based on current direction
        const centerX = this.player.x;
        const centerY = this.player.y;
        const size = this.gridSize / 6;
        
        let indicatorX = centerX;
        let indicatorY = centerY;
        
        switch (this.playerDirection) {
            case 0: // Right
                indicatorX += size;
                break;
            case 1: // Down
                indicatorY += size;
                break;
            case 2: // Left
                indicatorX -= size;
                break;
            case 3: // Up
                indicatorY -= size;
                break;
        }
        
        this.directionIndicator = this.add.circle(indicatorX, indicatorY, size, 0xFFEB3B);
        this.directionIndicator.setStrokeStyle(2, 0xF57F17);
    }

    // Movement and interaction methods
    movePlayer(direction, steps = 1) {
        if (this.isExecuting) return false;
        
        const moveDirections = [
            { x: 1, y: 0 },   // Right
            { x: 0, y: 1 },   // Down
            { x: -1, y: 0 },  // Left
            { x: 0, y: -1 }   // Up
        ];
        
        const dir = moveDirections[direction];
        let moved = false;
        
        for (let i = 0; i < steps; i++) {
            const newX = this.playerGridX + dir.x;
            const newY = this.playerGridY + dir.y;
            
            if (this.isValidPosition(newX, newY)) {
                this.playerGridX = newX;
                this.playerGridY = newY;
                moved = true;
            } else {
                break; // Stop if we hit an obstacle
            }
        }
        
        if (moved) {
            this.animatePlayerMovement();
        }
        
        return moved;
    }

    turnPlayer(direction) {
        if (direction === 'left') {
            this.playerDirection = (this.playerDirection + 3) % 4; // Turn left
        } else if (direction === 'right') {
            this.playerDirection = (this.playerDirection + 1) % 4; // Turn right
        }
        this.updatePlayerDirection();
    }

    lookAround(direction) {
        const lookDirection = direction === 'left' 
            ? (this.playerDirection + 3) % 4 
            : (this.playerDirection + 1) % 4;
        
        const moveDirections = [
            { x: 1, y: 0 },   // Right
            { x: 0, y: 1 },   // Down
            { x: -1, y: 0 },  // Left
            { x: 0, y: -1 }   // Up
        ];
        
        const dir = moveDirections[lookDirection];
        const lookX = this.playerGridX + dir.x;
        const lookY = this.playerGridY + dir.y;
        
        // Show what the player sees
        this.showLookIndicator(lookX, lookY, direction);
        
        return this.isValidPosition(lookX, lookY) ? 'clear' : 'blocked';
    }

    showLookIndicator(x, y, direction) {
        // Remove old look indicator
        if (this.lookIndicator) {
            this.lookIndicator.destroy();
        }
        
        if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
            const color = this.isValidPosition(x, y) ? 0x4CAF50 : 0xF44336;
            this.lookIndicator = this.add.circle(
                (x * this.gridSize) + this.gridSize / 2,
                (y * this.gridSize) + this.gridSize / 2,
                this.gridSize / 4,
                color
            );
            this.lookIndicator.setAlpha(0.7);
            
            // Remove indicator after 1 second
            this.time.delayedCall(1000, () => {
                if (this.lookIndicator) {
                    this.lookIndicator.destroy();
                    this.lookIndicator = null;
                }
            });
        }
    }

    isValidPosition(x, y) {
        // Check boundaries
        if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
            return false;
        }
        
        // Check for obstacles (simplified - would need proper collision detection in a real game)
        if ((x === 5 && y >= 2 && y <= 5) || 
            (x === 10 && y >= 6 && y <= 9) ||
            (x >= 15 && x <= 17 && y === 3)) {
            return false;
        }
        
        return true;
    }

    animatePlayerMovement() {
        const targetX = (this.playerGridX * this.gridSize) + this.gridSize / 2;
        const targetY = (this.playerGridY * this.gridSize) + this.gridSize / 2;
        
        this.tweens.add({
            targets: this.player,
            x: targetX,
            y: targetY,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.updatePlayerDirection();
            }
        });
    }

    // Program execution methods
    executeProgram(commands) {
        if (this.isExecuting) return;
        
        this.isExecuting = true;
        this.executionQueue = [...commands];
        this.currentCommand = 0;
        
        this.executeNextCommand();
    }

    executeNextCommand() {
        if (this.currentCommand >= this.executionQueue.length) {
            this.isExecuting = false;
            this.executionQueue = [];
            this.currentCommand = 0;
            // Notify Blockly system that execution is complete
            if (window.blocklySystem) {
                window.blocklySystem.isExecuting = false;
            }
            return;
        }
        
        const command = this.executionQueue[this.currentCommand];
        this.currentCommand++;
        
        let delay = 500; // Default delay between commands
        
        switch (command.type) {
            case 'go-straight':
                this.movePlayer(this.playerDirection, command.steps || 1);
                delay = 300 * (command.steps || 1);
                break;
            case 'turn-left':
                this.turnPlayer('left');
                delay = 200;
                break;
            case 'turn-right':
                this.turnPlayer('right');
                delay = 200;
                break;
            case 'look-left':
                this.lookAround('left');
                delay = 1000;
                break;
            case 'look-right':
                this.lookAround('right');
                delay = 1000;
                break;
        }
        
        // Continue to next command after delay
        this.time.delayedCall(delay, () => {
            this.executeNextCommand();
        });
    }

    stopExecution() {
        this.isExecuting = false;
        this.executionQueue = [];
        this.currentCommand = 0;
        
        // Remove any pending timers
        this.time.removeAllEvents();
        
        // Remove look indicator if present
        if (this.lookIndicator) {
            this.lookIndicator.destroy();
            this.lookIndicator = null;
        }
    }

    resetPlayer() {
        this.stopExecution();
        
        // Reset player position
        this.playerGridX = 2;
        this.playerGridY = 2;
        this.playerDirection = 0;
        
        // Update player visual
        this.player.setPosition(
            (this.playerGridX * this.gridSize) + this.gridSize / 2,
            (this.playerGridY * this.gridSize) + this.gridSize / 2
        );
        this.updatePlayerDirection();
    }
}

// Game configuration
const gameConfig = {
    type: Phaser.AUTO,
    width: 960,  // Optimized for 1366x598 window (70% = ~956px)
    height: 540, // Optimized for 1366x598 window (minus controls = ~540px)
    parent: 'game-container',
    backgroundColor: '#34495e',
    scene: GameScene,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 960,
        height: 540,
        min: {
            width: 640,
            height: 360
        },
        max: {
            width: 1920,
            height: 1080
        }
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    }
};

// Initialize the game
let game = null;

function initGame() {
    if (!game) {
        game = new Phaser.Game(gameConfig);
    }
    return game;
}

// Export for use in other modules
window.GameAPI = {
    initGame,
    getGame: () => game,
    getScene: () => game ? game.scene.getScene('GameScene') : null
};