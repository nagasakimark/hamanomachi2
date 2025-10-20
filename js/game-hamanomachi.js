// Game configuration and Hamanomachi integration
// Audio mode setting (1 = enabled, 0 = disabled)
const AUDIO_MODE = 1;

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        // Hamanomachi game state
        this.mapData = null;
        this.currentPlayerPosition = null;
        this.targetPlayerPosition = null;
        this.startingPosition = null; // Store starting position for resets
        this.currentConnections = [];
        this.destination = null;
        this.gameOver = false;
        this.playerAngle = 0;
        this.targetAngle = 0;
        this.isMoving = false;
        this.mapScale = 1;
        this.forcedRotation = false;
        
        // Phaser-specific objects
        this.mapSprite = null;
        this.playerSprite = null;
        this.destinationSprite = null;
        this.connectionGraphics = null;
        this.pointsGraphics = null;
        
        // Animation settings
        this.MOVEMENT_SPEED = 100; // pixels per second
        this.ROTATION_SPEED = Math.PI; // radians per second
        this.SPRITE_SIZE = 64;
        this.SPRITE_COLS = 4;
        this.SPRITE_ROWS = 4;
        
        // Command queue
        this.commandQueue = [];
        this.isExecuting = false;
        
        // Score tracking
        this.score = 0;
        
        // Easter egg: track turn sequence
        this.turnSequence = [];
        
        // Debug settings
        this.showPoints = false;
        this.showPaths = false;
        
        // Track if this is first initialization
        this.needsHighlight = true;
    }

    init() {
        // This runs every time the scene starts (including after page refresh)
        this.needsHighlight = true;
    }

    preload() {
        // Load map assets
        this.load.image('map', 'assets/images/map.png');
        this.load.spritesheet('player', 'assets/images/player.png', {
            frameWidth: this.SPRITE_SIZE,
            frameHeight: this.SPRITE_SIZE
        });
        
        // Load map data
        this.load.json('mapData', 'assets/map_data.json');
    }

    create() {
        // Load map data
        this.mapData = this.cache.json.get('mapData');
        
        // Create map sprite
        this.mapSprite = this.add.image(0, 0, 'map').setOrigin(0, 0);
        
        // Calculate scale to fit the available game area dynamically
        const gameWidth = this.sys.game.config.width;
        const gameHeight = this.sys.game.config.height;
        this.mapScale = Math.min(gameWidth / this.mapSprite.width, gameHeight / this.mapSprite.height);
        this.mapSprite.setScale(this.mapScale);
        
        // Center the map in the available space
        const scaledWidth = this.mapSprite.width * this.mapScale;
        const scaledHeight = this.mapSprite.height * this.mapScale;
        this.mapSprite.setPosition(
            (gameWidth - scaledWidth) / 2,
            (gameHeight - scaledHeight) / 2
        );
        
        // Create graphics for debugging
        this.connectionGraphics = this.add.graphics();
        this.pointsGraphics = this.add.graphics();
        
        // Create player sprite with animations
        this.createPlayerAnimations();
        this.playerSprite = this.add.sprite(0, 0, 'player', 0);
        this.playerSprite.setScale(1.8 * this.mapScale); // 1.5x again (was 1.2, now 1.8)
        this.playerSprite.setOrigin(0.5, 0.84); // Origin ~10 pixels up from bottom (1.0 - 10/64 ≈ 0.84)
        this.playerSprite.setDepth(10); // Ensure player is on top
        
        // Enable pixel-perfect rendering (no blur/anti-aliasing)
        this.playerSprite.setTexture('player', 0);
        this.playerSprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        
        // Initialize game
        this.initializeGame();
        
        // Set up camera to show the entire map
        this.cameras.main.setBounds(0, 0, gameWidth, gameHeight);
        
        // Note: Resize handling is managed by the RESIZE scale mode in game config
    }

    handleResize(gameSize) {
        const { width, height } = gameSize;
        
        if (this.mapSprite) {
            // Recalculate scale for new size
            this.mapScale = Math.min(width / this.mapSprite.width, height / this.mapSprite.height);
            this.mapSprite.setScale(this.mapScale);
            
            // Recenter the map
            const scaledWidth = this.mapSprite.width * this.mapScale;
            const scaledHeight = this.mapSprite.height * this.mapScale;
            this.mapSprite.setPosition(
                (width - scaledWidth) / 2,
                (height - scaledHeight) / 2
            );
            
            // Update player sprite if it exists
            if (this.playerSprite && this.currentPlayerPosition) {
                this.playerSprite.setScale(1.8 * this.mapScale); // 1.5x again (was 1.2, now 1.8)
                this.updatePlayerSprite();
            }
            
            // Update camera bounds
            this.cameras.main.setBounds(0, 0, width, height);
            
            // Redraw debug info
            this.drawDebugInfo();
        }
    }

    createPlayerAnimations() {
        // Create walking animations for each direction
        // Common RPG sprite sheet order: down, left, right, up
        const directions = ['down', 'left', 'right', 'up'];
        
        directions.forEach((direction, row) => {
            this.anims.create({
                key: `walk-${direction}`,
                frames: this.anims.generateFrameNumbers('player', {
                    start: row * this.SPRITE_COLS,
                    end: row * this.SPRITE_COLS + (this.SPRITE_COLS - 1)
                }),
                frameRate: 8,
                repeat: -1
            });
            
            this.anims.create({
                key: `idle-${direction}`,
                frames: [{ key: 'player', frame: row * this.SPRITE_COLS }],
                frameRate: 1
            });
        });
    }

    initializeGame() {
        if (!this.mapData || !this.mapData.points) {
            console.error('Map data not loaded properly');
            return;
        }

        // Reset turn sequence for easter egg
        this.turnSequence = [];

        // Get start points and destinations
        const startPoints = this.mapData.points.filter(p => p.type === 'start');
        const destinations = this.mapData.points.filter(p => p.type === 'destination');
        
        if (startPoints.length === 0 || destinations.length === 0) {
            console.error('No start points or destinations found');
            return;
        }
        
        // Select random start and destination
        const randomStartIndex = Math.floor(Math.random() * startPoints.length);
        this.currentPlayerPosition = { ...startPoints[randomStartIndex] };
        this.targetPlayerPosition = { ...this.currentPlayerPosition };
        this.startingPosition = { ...this.currentPlayerPosition }; // Store starting position
        
        // Choose destination not directly connected to start
        let validDestinations = destinations.filter(dest => {
            const directConnection = this.mapData.connections.some(conn => 
                (this.arePointsEqual(conn.p1, this.currentPlayerPosition) && this.arePointsEqual(conn.p2, dest)) ||
                (this.arePointsEqual(conn.p2, this.currentPlayerPosition) && this.arePointsEqual(conn.p1, dest))
            );
            return !directConnection;
        });

        if (validDestinations.length === 0) {
            validDestinations = destinations;
        }

        const randomDestIndex = Math.floor(Math.random() * validDestinations.length);
        this.destination = { ...validDestinations[randomDestIndex] };
        
        // Update player position and angle
        this.updatePlayerSprite();
        this.updateCurrentConnections();
        this.setInitialPlayerDirection();
        
        // Highlight the player on initial spawn (after brief delay to ensure sprite is fully rendered)
        if (this.needsHighlight) {
            this.time.delayedCall(200, () => {
                this.highlightPlayer();
                this.needsHighlight = false; // Only highlight once per scene initialization
            });
        }
        
        // Update UI immediately (before blocklySystem might be ready)
        const goalLabel = document.getElementById('goal-label');
        const goalText = document.getElementById('goal-text');
        const scoreValue = document.getElementById('score-value');
        if (scoreValue) {
            scoreValue.textContent = this.score;
        }
        
        // Setup audio mode if enabled
        if (AUDIO_MODE === 1) {
            const audioButton = document.getElementById('audio-play-button');
            const audioElement = document.getElementById('destination-audio');
            
            if (audioButton && audioElement) {
                // Hide only the goal text, keep "Goal:" label visible
                if (goalText) {
                    goalText.style.display = 'none';
                }
                audioButton.style.display = 'inline-block';
                
                // Convert destination name to audio filename
                const audioFilename = this.getAudioFilename(this.destination.name);
                audioElement.src = `assets/audio/female/${audioFilename}`;
                
                // Remove any existing click handlers and add new one
                audioButton.onclick = () => {
                    audioElement.currentTime = 0; // Reset to start
                    audioElement.play().catch(err => {
                        console.error('Audio playback failed:', err);
                    });
                };
            }
        } else {
            // If audio mode is disabled, show the destination name
            if (goalText) {
                goalText.style.display = 'inline';
                goalText.textContent = this.destination.name;
            }
        }
        
        // Also update via blocklySystem if available
        if (window.blocklySystem) {
            if (window.blocklySystem.updateDestination) {
                window.blocklySystem.updateDestination(this.destination.name);
            }
            if (window.blocklySystem.updateScore) {
                window.blocklySystem.updateScore(this.score);
            }
        }
        
        this.gameOver = false;
        this.isMoving = false;
        
        console.log(`Game initialized! Go from ${this.currentPlayerPosition.id || 'start'} to ${this.destination.name}`);
        
        // Draw debug info if enabled
        this.drawDebugInfo();
    }

    getAudioFilename(destinationName) {
        // Remove all spaces and punctuation, convert to lowercase
        return destinationName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '') // Remove everything except letters and numbers
            + '.mp3';
    }

    updatePlayerSprite() {
        if (!this.playerSprite || !this.currentPlayerPosition) return;
        
        // Account for map centering offset
        const gameWidth = this.sys.game.config.width;
        const gameHeight = this.sys.game.config.height;
        const scaledWidth = this.mapSprite.width * this.mapScale;
        const scaledHeight = this.mapSprite.height * this.mapScale;
        const mapOffsetX = (gameWidth - scaledWidth) / 2;
        const mapOffsetY = (gameHeight - scaledHeight) / 2;
        
        this.playerSprite.setPosition(
            mapOffsetX + this.currentPlayerPosition.x * this.mapScale,
            mapOffsetY + this.currentPlayerPosition.y * this.mapScale // Position uses bottom-center origin now
        );
    }

    highlightPlayer() {
        if (!this.playerSprite) return;
        
        // Create a pulsing highlight effect with scale and tint
        this.tweens.add({
            targets: this.playerSprite,
            scaleX: 2.1 * this.mapScale, // 1.5x pulse from 1.8 base = 2.7, using 2.1 for subtler effect
            scaleY: 2.1 * this.mapScale,
            duration: 300,
            yoyo: true,
            repeat: 2,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                // Reset to normal scale
                this.playerSprite.setScale(1.8 * this.mapScale);
            }
        });
        
        // Add a bright tint flash
        this.tweens.add({
            targets: this.playerSprite,
            tint: 0xFFFFFF,
            duration: 150,
            yoyo: true,
            repeat: 2,
            ease: 'Sine.easeInOut'
        });
        
        // Create a circular glow effect around the player
        const glowCircle = this.add.circle(
            this.playerSprite.x,
            this.playerSprite.y,
            30 * this.mapScale,
            0xFFFF00,
            0.6
        );
        glowCircle.setDepth(9); // Just below player
        
        // Animate the glow circle
        this.tweens.add({
            targets: glowCircle,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                glowCircle.destroy();
            }
        });
    }

    updateCurrentConnections() {
        if (!this.mapData || !this.currentPlayerPosition) return;
        
        this.currentConnections = this.mapData.connections.filter(conn => 
            this.arePointsEqual(conn.p1, this.currentPlayerPosition) ||
            this.arePointsEqual(conn.p2, this.currentPlayerPosition)
        );
        
        console.log(`Available connections from current position: ${this.currentConnections.length}`);
    }

    setInitialPlayerDirection() {
        if (this.currentConnections.length > 0) {
            const firstConnection = this.currentConnections[0];
            this.playerAngle = this.getConnectionAngle(firstConnection);
            this.targetAngle = this.playerAngle;
            this.updatePlayerAnimation();
        }
    }

    arePointsEqual(p1, p2, tolerance = 1) {
        if (!p1 || !p2) return false;
        return Math.abs(p1.x - p2.x) <= tolerance && Math.abs(p1.y - p2.y) <= tolerance;
    }

    getConnectionAngle(connection) {
        const isP1 = this.arePointsEqual(connection.p1, this.currentPlayerPosition);
        const targetPoint = isP1 ? connection.p2 : connection.p1;
        const dx = targetPoint.x - this.currentPlayerPosition.x;
        const dy = targetPoint.y - this.currentPlayerPosition.y;
        return Math.atan2(dy, dx);
    }

    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle <= -Math.PI) angle += 2 * Math.PI;
        return angle;
    }

    getSpriteDirection(angle) {
        // Normalize angle to [0, 2π) range
        const normalizedAngle = ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
        // Convert to degrees for easier comparison
        const degrees = normalizedAngle * 180 / Math.PI;
        
        // Map angles to directions accounting for Phaser's coordinate system
        // In Phaser: +X = right, +Y = down, -X = left, -Y = up
        // Math.atan2: 0° = right, 90° = down, 180° = left, 270° = up
        if (degrees >= 315 || degrees < 45) return 'right';      // -22.5° to 22.5° (East)
        if (degrees >= 45 && degrees < 135) return 'down';       // 22.5° to 112.5° (South)
        if (degrees >= 135 && degrees < 225) return 'left';      // 112.5° to 202.5° (West)
        return 'up';                                             // 202.5° to 292.5° (North)
    }

    updatePlayerAnimation() {
        if (!this.playerSprite) return;
        
        const direction = this.getSpriteDirection(this.playerAngle);
        const animKey = this.isMoving ? `walk-${direction}` : `idle-${direction}`;
        
        console.log(`🎭 updatePlayerAnimation: angle=${(this.playerAngle * 180 / Math.PI).toFixed(1)}°, direction=${direction}, animKey=${animKey}`);
        
        if (this.playerSprite.anims.currentAnim?.key !== animKey) {
            this.playerSprite.play(animKey);
        }
    }

    drawDebugInfo() {
        if (!this.connectionGraphics || !this.pointsGraphics) return;
        
        this.connectionGraphics.clear();
        this.pointsGraphics.clear();
        
        if (this.showPaths) {
            this.drawPaths();
        }
        
        if (this.showPoints) {
            this.drawPoints();
        }
        
        // Always draw destination
        if (this.destination) {
            const gameWidth = this.sys.game.config.width;
            const gameHeight = this.sys.game.config.height;
            const scaledWidth = this.mapSprite.width * this.mapScale;
            const scaledHeight = this.mapSprite.height * this.mapScale;
            const mapOffsetX = (gameWidth - scaledWidth) / 2;
            const mapOffsetY = (gameHeight - scaledHeight) / 2;
            
            this.pointsGraphics.fillStyle(0xff4081, 0.8);
            this.pointsGraphics.fillCircle(
                mapOffsetX + this.destination.x * this.mapScale,
                mapOffsetY + this.destination.y * this.mapScale,
                8 * this.mapScale
            );
        }
    }

    drawPaths() {
        const gameWidth = this.sys.game.config.width;
        const gameHeight = this.sys.game.config.height;
        const scaledWidth = this.mapSprite.width * this.mapScale;
        const scaledHeight = this.mapSprite.height * this.mapScale;
        const mapOffsetX = (gameWidth - scaledWidth) / 2;
        const mapOffsetY = (gameHeight - scaledHeight) / 2;
        
        // Draw all connections
        this.connectionGraphics.lineStyle(3 * this.mapScale, 0x0000ff, 0.3);
        this.mapData.connections.forEach(connection => {
            this.connectionGraphics.beginPath();
            this.connectionGraphics.moveTo(
                mapOffsetX + connection.p1.x * this.mapScale, 
                mapOffsetY + connection.p1.y * this.mapScale
            );
            this.connectionGraphics.lineTo(
                mapOffsetX + connection.p2.x * this.mapScale, 
                mapOffsetY + connection.p2.y * this.mapScale
            );
            this.connectionGraphics.strokePath();
        });

        // Draw current connections more prominently
        if (this.currentConnections.length > 0) {
            this.connectionGraphics.lineStyle(5 * this.mapScale, 0xff0000, 0.6);
            this.currentConnections.forEach(connection => {
                this.connectionGraphics.beginPath();
                this.connectionGraphics.moveTo(
                    mapOffsetX + connection.p1.x * this.mapScale, 
                    mapOffsetY + connection.p1.y * this.mapScale
                );
                this.connectionGraphics.lineTo(
                    mapOffsetX + connection.p2.x * this.mapScale, 
                    mapOffsetY + connection.p2.y * this.mapScale
                );
                this.connectionGraphics.strokePath();
            });
        }
    }

    drawPoints() {
        const gameWidth = this.sys.game.config.width;
        const gameHeight = this.sys.game.config.height;
        const scaledWidth = this.mapSprite.width * this.mapScale;
        const scaledHeight = this.mapSprite.height * this.mapScale;
        const mapOffsetX = (gameWidth - scaledWidth) / 2;
        const mapOffsetY = (gameHeight - scaledHeight) / 2;
        
        this.mapData.points.forEach(point => {
            let color;
            switch(point.type) {
                case 'start': color = 0x00c853; break;
                case 'destination': color = 0xff4081; break;
                case 'littlebit': color = 0xffa500; break;
                default: color = 0x2196f3;
            }
            
            this.pointsGraphics.fillStyle(color, 0.8);
            this.pointsGraphics.fillCircle(
                mapOffsetX + point.x * this.mapScale,
                mapOffsetY + point.y * this.mapScale,
                6 * this.mapScale
            );
        });
    }

    // Command execution methods
    async executeCommand(command, value = 1) {
        return new Promise((resolve) => {
            switch (command) {
                case 'move-forward':
                    this.moveStraight(value).then(resolve);
                    break;
                case 'move-forward-littlebit':
                    this.moveStraightLittlebit(value).then(resolve);
                    break;
                case 'turn-left':
                    this.turnLeft().then(resolve);
                    break;
                case 'turn-right':
                    this.turnRight().then(resolve);
                    break;
                case 'look-left':
                    this.lookLeft().then(resolve);
                    break;
                case 'look-right':
                    this.lookRight().then(resolve);
                    break;
                default:
                    resolve();
            }
        });
    }

    async executeCommandQueue(commands) {
        if (this.isExecuting) return;
        
        this.isExecuting = true;
        console.log('Executing commands:', commands);
        
        for (const command of commands) {
            if (this.gameOver) break;
            await this.executeCommand(command.type, command.value);
        }
        
        this.isExecuting = false;
        console.log('Finished executing commands');
        
        // Check if player reached destination after all commands completed
        if (!this.gameOver && !this.arePointsEqual(this.currentPlayerPosition, this.destination)) {
            this.handleFailure();
        }
    }

    // Movement methods adapted from Hamanomachi
    async moveStraight(blocks = 1) {
        if (this.gameOver || this.isMoving || this.currentConnections.length === 0) {
            console.log('Cannot move: gameOver=' + this.gameOver + ', isMoving=' + this.isMoving + ', connections=' + this.currentConnections.length);
            return Promise.resolve();
        }
        
        // Reset turn sequence - movement breaks the spinning pattern
        this.turnSequence = [];
        
        console.log(`Moving straight for ${blocks} blocks from (${this.currentPlayerPosition.x}, ${this.currentPlayerPosition.y})`);
        const pathCheck = this.canMoveStraightFor(blocks);
        
        if (!pathCheck.possible) {
            console.log(`Cannot move: ${pathCheck.reason}`);
            return Promise.resolve();
        }
        
        console.log(`Path calculated with ${pathCheck.path.length} points:`, pathCheck.path);
        return this.startPathMovement(pathCheck.path, pathCheck.finalAngle);
    }

    canMoveStraightFor(blocks) {
        if (blocks <= 0) return { possible: false, reason: "Invalid block count" };
        
        let currentPos = { ...this.currentPlayerPosition };
        let currentAngle = this.playerAngle;
        let remainingBlocks = blocks;
        let path = [currentPos];
        
        console.log(`Calculating path for ${blocks} blocks, starting angle: ${(currentAngle * 180 / Math.PI).toFixed(1)}°`);
        
        while (remainingBlocks > 0) {
            let connections = this.mapData.connections.filter(conn => 
                this.arePointsEqual(conn.p1, currentPos) ||
                this.arePointsEqual(conn.p2, currentPos)
            );
            
            let bestConnection = null;
            let smallestAngleDiff = Math.PI / 6; // ~30 degrees tolerance (was too tight at 20)
            
            for (const connection of connections) {
                const nextPos = this.arePointsEqual(connection.p1, currentPos) ? 
                    connection.p2 : connection.p1;
                const dx = nextPos.x - currentPos.x;
                const dy = nextPos.y - currentPos.y;
                const connectionAngle = Math.atan2(dy, dx);
                const angleDiff = Math.abs(this.normalizeAngle(connectionAngle - currentAngle));
                
                if (angleDiff < smallestAngleDiff) {
                    smallestAngleDiff = angleDiff;
                    bestConnection = connection;
                }
            }
            
            if (!bestConnection) {
                console.log(`No path forward at position (${currentPos.x}, ${currentPos.y}), ${remainingBlocks} blocks remaining`);
                return {
                    possible: false,
                    reason: "No valid path forward",
                    validBlocks: blocks - remainingBlocks
                };
            }
            
            const nextPos = this.arePointsEqual(bestConnection.p1, currentPos) ? 
                bestConnection.p2 : bestConnection.p1;
            path.push(nextPos);
            
            // Only decrement for non-littlebit points and not start3
            const nextPoint = this.mapData.points.find(p => this.arePointsEqual(p, nextPos));
            const isLittlebit = nextPoint && nextPoint.type === 'littlebit';
            const isStart3 = nextPoint && nextPoint.id === 'start3';
            
            if (!isLittlebit && !isStart3) {
                remainingBlocks--;
                console.log(`✓ Moved to MAJOR point (${nextPos.x}, ${nextPos.y}) [${nextPoint?.name || 'unnamed'}], ${remainingBlocks} blocks remaining`);
            } else if (isStart3) {
                console.log(`→ Passed through start3 point (${nextPos.x}, ${nextPos.y}) - IGNORED`);
            } else {
                console.log(`→ Passed through littlebit point (${nextPos.x}, ${nextPos.y})`);
            }
            
            currentPos = { ...nextPos };
            currentAngle = Math.atan2(nextPos.y - path[path.length - 2].y, 
                                    nextPos.x - path[path.length - 2].x);
            
            // Check if we reached destination
            if (this.arePointsEqual(nextPos, this.destination)) {
                console.log('Reached destination in path calculation');
                // Always allow reaching destination, even if blocks remain
                break;
            }
        }
        
        console.log(`Path calculation complete: ${path.length} total points (including start position)`);
        console.log(`Path points:`, path.map((p, i) => {
            const point = this.mapData.points.find(pt => this.arePointsEqual(pt, p));
            return `[${i}] (${p.x}, ${p.y}) ${point ? point.type : 'unknown'}`;
        }));
        return {
            possible: true,
            path: path,
            finalAngle: currentAngle
        };
    }

    async moveStraightLittlebit(blocks = 1) {
        if (this.gameOver || this.isMoving || this.currentConnections.length === 0) {
            return Promise.resolve();
        }
        
        // Reset turn sequence - movement breaks the spinning pattern
        this.turnSequence = [];
        
        const pathCheck = this.canMoveStraightForLittlebit();
        
        if (!pathCheck.possible) {
            console.log(`Cannot move littlebit: ${pathCheck.reason}`);
            return Promise.resolve();
        }
        
        return this.startPathMovement(pathCheck.path, pathCheck.finalAngle);
    }

    canMoveStraightForLittlebit() {
        let currentPos = { ...this.currentPlayerPosition };
        let currentAngle = this.playerAngle;
        let path = [currentPos];
        let littlebitPointsFound = [];
        
        console.log('Checking littlebit path from', currentPos, 'to destination', this.destination.name);
        
        // First, move forward and collect all littlebit points until we hit a non-littlebit point
        while (true) {
            let connections = this.mapData.connections.filter(conn => 
                this.arePointsEqual(conn.p1, currentPos) ||
                this.arePointsEqual(conn.p2, currentPos)
            );
            
            let bestConnection = null;
            let smallestAngleDiff = Math.PI / 6; // ~30 degrees tolerance
            
            for (const connection of connections) {
                const nextPos = this.arePointsEqual(connection.p1, currentPos) ? 
                    connection.p2 : connection.p1;
                const dx = nextPos.x - currentPos.x;
                const dy = nextPos.y - currentPos.y;
                const connectionAngle = Math.atan2(dy, dx);
                const angleDiff = Math.abs(this.normalizeAngle(connectionAngle - currentAngle));
                
                if (angleDiff < smallestAngleDiff) {
                    smallestAngleDiff = angleDiff;
                    bestConnection = connection;
                }
            }
            
            if (!bestConnection) {
                console.log('No path forward found');
                return {
                    possible: false,
                    reason: "No valid path forward"
                };
            }
            
            const nextPos = this.arePointsEqual(bestConnection.p1, currentPos) ? 
                bestConnection.p2 : bestConnection.p1;
            
            // Check what type of point this is
            const nextPoint = this.mapData.points.find(p => this.arePointsEqual(p, nextPos));
            
            // Check if we reached destination
            if (this.arePointsEqual(nextPos, this.destination)) {
                console.log('Found destination directly');
                path.push(nextPos);
                currentAngle = Math.atan2(nextPos.y - currentPos.y, nextPos.x - currentPos.x);
                break;
            }
            
            // If it's a littlebit point OR start3, add it to our list (treat start3 like littlebit)
            const isLittlebit = nextPoint && nextPoint.type === 'littlebit';
            const isStart3 = nextPoint && nextPoint.id === 'start3';
            
            if (isLittlebit || isStart3) {
                console.log(isStart3 ? 'Found start3 (treated as littlebit) at' : 'Found littlebit point at', nextPos);
                littlebitPointsFound.push({ pos: nextPos, pathSoFar: [...path, nextPos] });
                path.push(nextPos);
                currentPos = { ...nextPos };
                currentAngle = Math.atan2(nextPos.y - path[path.length - 2].y, 
                                        nextPos.x - path[path.length - 2].x);
            } else {
                // Hit a non-littlebit point, stop collecting
                console.log('Hit non-littlebit point at', nextPos);
                path.push(nextPos);
                currentAngle = Math.atan2(nextPos.y - currentPos.y, nextPos.x - currentPos.x);
                break;
            }
        }
        
        // Now check if any of the littlebit points we found are directly connected to the destination
        for (const littlebitInfo of littlebitPointsFound) {
            const isConnectedToDestination = this.mapData.connections.some(conn => 
                (this.arePointsEqual(conn.p1, littlebitInfo.pos) && this.arePointsEqual(conn.p2, this.destination)) ||
                (this.arePointsEqual(conn.p2, littlebitInfo.pos) && this.arePointsEqual(conn.p1, this.destination))
            );
            
            if (isConnectedToDestination) {
                console.log('Found littlebit point connected to destination!', littlebitInfo.pos);
                // Use the path up to this littlebit point
                const finalAngle = Math.atan2(
                    littlebitInfo.pos.y - littlebitInfo.pathSoFar[littlebitInfo.pathSoFar.length - 2].y,
                    littlebitInfo.pos.x - littlebitInfo.pathSoFar[littlebitInfo.pathSoFar.length - 2].x
                );
                return {
                    possible: true,
                    path: littlebitInfo.pathSoFar,
                    finalAngle: finalAngle
                };
            }
        }
        
        // If no littlebit point is connected to destination, stop at the first littlebit point or end of path
        if (littlebitPointsFound.length > 0) {
            console.log('No littlebit connected to destination, stopping at first littlebit');
            const firstLittlebit = littlebitPointsFound[0];
            const finalAngle = Math.atan2(
                firstLittlebit.pos.y - firstLittlebit.pathSoFar[firstLittlebit.pathSoFar.length - 2].y,
                firstLittlebit.pos.x - firstLittlebit.pathSoFar[firstLittlebit.pathSoFar.length - 2].x
            );
            return {
                possible: true,
                path: firstLittlebit.pathSoFar,
                finalAngle: finalAngle
            };
        }
        
        // No littlebit points found, use the full path
        console.log('No littlebit points found, using full path');
        return {
            possible: true,
            path: path,
            finalAngle: currentAngle
        };
    }

    async startPathMovement(path, finalAngle) {
        if (path.length < 2) return Promise.resolve();
        
        return new Promise((resolve) => {
            this.isMoving = true;
            
            // DON'T override the player's angle here - they may have just turned!
            // The angle will be updated for each segment in moveToNext()
            // Just make sure the animation is showing
            this.updatePlayerAnimation();
            
            // Calculate map offset for centered positioning
            const gameWidth = this.sys.game.config.width;
            const gameHeight = this.sys.game.config.height;
            const scaledWidth = this.mapSprite.width * this.mapScale;
            const scaledHeight = this.mapSprite.height * this.mapScale;
            const mapOffsetX = (gameWidth - scaledWidth) / 2;
            const mapOffsetY = (gameHeight - scaledHeight) / 2;
            
            let currentIndex = 0;
            
            const moveToNext = () => {
                if (currentIndex >= path.length - 1) {
                    // Movement complete
                    this.targetPlayerPosition = { ...this.currentPlayerPosition };
                    
                    // Set final angle
                    if (path.length >= 2) {
                        const lastSegment = path.length - 1;
                        const dx = path[lastSegment].x - path[lastSegment - 1].x;
                        const dy = path[lastSegment].y - path[lastSegment - 1].y;
                        this.playerAngle = Math.atan2(dy, dx);
                        this.targetAngle = this.playerAngle;
                    }
                    
                    this.isMoving = false;
                    this.updatePlayerAnimation();
                    this.updateCurrentConnections();
                    this.updatePlayerSprite();
                    
                    console.log(`Movement complete at (${this.currentPlayerPosition.x}, ${this.currentPlayerPosition.y})`);
                    
                    // Check win condition
                    if (this.arePointsEqual(this.currentPlayerPosition, this.destination)) {
                        this.handleWin();
                    }
                    
                    resolve();
                    return;
                }
                
                const startPos = path[currentIndex];
                const endPos = path[currentIndex + 1];
                const distance = Math.sqrt(
                    Math.pow(endPos.x - startPos.x, 2) + 
                    Math.pow(endPos.y - startPos.y, 2)
                );
                const duration = (distance / this.MOVEMENT_SPEED) * 1000;
                
                // Update angle for this segment
                const dx = endPos.x - startPos.x;
                const dy = endPos.y - startPos.y;
                const segmentAngle = Math.atan2(dy, dx);
                this.playerAngle = segmentAngle;
                this.targetAngle = segmentAngle;
                
                const direction = this.getSpriteDirection(segmentAngle);
                console.log(`Moving segment ${currentIndex + 1}/${path.length - 1}: (${startPos.x}, ${startPos.y}) -> (${endPos.x}, ${endPos.y}), angle: ${(segmentAngle * 180 / Math.PI).toFixed(1)}°, sprite facing: ${direction}`);
                
                this.updatePlayerAnimation();
                
                // Move player sprite with linear easing for constant speed
                this.tweens.add({
                    targets: this.playerSprite,
                    x: mapOffsetX + endPos.x * this.mapScale,
                    y: mapOffsetY + endPos.y * this.mapScale - 10 * this.mapScale,
                    duration: duration,
                    ease: 'Linear', // Linear easing for constant speed - no slowing down
                    onComplete: () => {
                        // Update position after segment completes
                        this.currentPlayerPosition = { ...endPos };
                        currentIndex++;
                        // Immediately move to next segment with no delay
                        moveToNext();
                    }
                });
            };
            
            moveToNext();
        });
    }

    async turnLeft() {
        if (this.gameOver) {
            console.log('Cannot turn left: game is over');
            return Promise.resolve();
        }
        
        if (this.isMoving) {
            console.log('Cannot turn left: player is currently moving');
            // Wait for movement to complete
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (!this.isMoving) {
                        clearInterval(checkInterval);
                        this.turnLeft().then(resolve);
                    }
                }, 50);
            });
        }
        
        if (this.currentConnections.length === 0) {
            console.log('Cannot turn left: no connections available');
            return Promise.resolve();
        }
        
        // Track turn for easter egg
        this.turnSequence.push('left');
        this.checkSpinEasterEgg();
        
        return new Promise((resolve) => {
            const currentAngle = this.normalizeAngle(this.playerAngle);
            console.log(`Attempting to turn left from angle: ${(currentAngle * 180 / Math.PI).toFixed(1)}°`);
            console.log(`Current connections:`, this.currentConnections.length);
            
            const possibleTurns = this.currentConnections
                .map(connection => {
                    const angle = this.getConnectionAngle(connection);
                    let angleDiff = this.normalizeAngle(angle - currentAngle);
                    if (angleDiff > 0) angleDiff -= 2 * Math.PI;
                    return { connection, angle, angleDiff, degrees: (angleDiff * 180 / Math.PI).toFixed(1) };
                })
                .filter(turn => turn.angleDiff < -0.1)
                .sort((a, b) => b.angleDiff - a.angleDiff);

            console.log(`Found ${possibleTurns.length} left turn options:`, possibleTurns.map(t => t.degrees + '°'));

            if (possibleTurns.length > 0) {
                // Find the turn closest to -90° (a proper left turn), preferring turns between -135° and -45°
                const idealTurn = possibleTurns.find(turn => turn.angleDiff <= -Math.PI / 4 && turn.angleDiff >= -3 * Math.PI / 4);
                const selectedTurn = idealTurn || possibleTurns[0];
                this.targetAngle = selectedTurn.angle;
                console.log(`Turning left to angle: ${(this.targetAngle * 180 / Math.PI).toFixed(1)}°`);
                this.rotateToTarget().then(() => {
                    // Update connections after rotation completes
                    this.updateCurrentConnections();
                    resolve();
                });
            } else {
                console.warn('⚠️ NO LEFT TURN AVAILABLE - Cannot turn left from this position');
                // Add a small delay so the failed turn doesn't immediately execute the next command
                this.time.delayedCall(300, resolve);
            }
        });
    }

    async turnRight() {
        if (this.gameOver) {
            console.log('Cannot turn right: game is over');
            return Promise.resolve();
        }
        
        if (this.isMoving) {
            console.log('Cannot turn right: player is currently moving');
            // Wait for movement to complete
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (!this.isMoving) {
                        clearInterval(checkInterval);
                        this.turnRight().then(resolve);
                    }
                }, 50);
            });
        }
        
        if (this.currentConnections.length === 0) {
            console.log('Cannot turn right: no connections available');
            return Promise.resolve();
        }
        
        // Track turn for easter egg
        this.turnSequence.push('right');
        this.checkSpinEasterEgg();
        
        return new Promise((resolve) => {
            const currentAngle = this.normalizeAngle(this.playerAngle);
            console.log(`Attempting to turn right from angle: ${(currentAngle * 180 / Math.PI).toFixed(1)}°`);
            console.log(`Current connections:`, this.currentConnections.length);
            
            const possibleTurns = this.currentConnections
                .map(connection => {
                    const angle = this.getConnectionAngle(connection);
                    let angleDiff = this.normalizeAngle(angle - currentAngle);
                    if (angleDiff < 0) angleDiff += 2 * Math.PI;
                    return { connection, angle, angleDiff, degrees: (angleDiff * 180 / Math.PI).toFixed(1) };
                })
                .filter(turn => turn.angleDiff > 0.1)
                .sort((a, b) => a.angleDiff - b.angleDiff);

            console.log(`Found ${possibleTurns.length} right turn options:`, possibleTurns.map(t => t.degrees + '°'));

            if (possibleTurns.length > 0) {
                // Find the turn closest to 90° (a proper right turn), preferring turns between 45° and 135°
                const idealTurn = possibleTurns.find(turn => turn.angleDiff >= Math.PI / 4 && turn.angleDiff <= 3 * Math.PI / 4);
                const selectedTurn = idealTurn || possibleTurns[0];
                this.targetAngle = selectedTurn.angle;
                console.log(`Turning right to angle: ${(this.targetAngle * 180 / Math.PI).toFixed(1)}°`);
                this.rotateToTarget().then(() => {
                    // Update connections after rotation completes  
                    this.updateCurrentConnections();
                    resolve();
                });
            } else {
                console.warn('⚠️ NO RIGHT TURN AVAILABLE - Cannot turn right from this position');
                // Add a small delay so the failed turn doesn't immediately execute the next command
                this.time.delayedCall(300, resolve);
            }
        });
    }

    async lookLeft() {
        console.log('Turning left and moving forward...');
        
        // First turn left
        await this.turnLeft();
        
        // Then move straight for 1 block
        await this.moveStraight(1);
        
        return Promise.resolve();
    }

    async lookRight() {
        console.log('Turning right and moving forward...');
        
        // First turn right
        await this.turnRight();
        
        // Then move straight for 1 block
        await this.moveStraight(1);
        
        return Promise.resolve();
    }

    async rotateToTarget() {
        return new Promise((resolve) => {
            const startAngle = this.playerAngle;
            let angleDiff = this.normalizeAngle(this.targetAngle - this.playerAngle);
            
            // Ensure we take the shortest path
            if (angleDiff > Math.PI) {
                angleDiff -= 2 * Math.PI;
            } else if (angleDiff < -Math.PI) {
                angleDiff += 2 * Math.PI;
            }
            
            const duration = (Math.abs(angleDiff) / this.ROTATION_SPEED) * 1000;
            const finalDuration = Math.max(duration, 500); // Minimum 500ms for better visibility
            
            console.log(`Rotating from ${(startAngle * 180 / Math.PI).toFixed(1)}° to ${(this.targetAngle * 180 / Math.PI).toFixed(1)}°, diff: ${(angleDiff * 180 / Math.PI).toFixed(1)}°, duration: ${finalDuration}ms`);
            
            if (Math.abs(angleDiff) < 0.01) {
                // Already facing the right direction
                console.log('Already facing target direction, no rotation needed');
                this.playerAngle = this.targetAngle;
                this.updatePlayerAnimation();
                resolve();
                return;
            }
            
            // Calculate the intermediate angle to tween to (don't directly tween to targetAngle)
            const intermediateTarget = startAngle + angleDiff;
            
            this.tweens.add({
                targets: this,
                playerAngle: intermediateTarget,
                duration: finalDuration,
                ease: 'Power2',
                onStart: () => {
                    console.log('Rotation tween started');
                },
                onUpdate: () => {
                    this.updatePlayerAnimation();
                },
                onComplete: () => {
                    // Set to exact target angle to avoid floating point errors
                    this.playerAngle = this.targetAngle;
                    this.updatePlayerAnimation();
                    console.log(`Rotation complete, now facing ${(this.playerAngle * 180 / Math.PI).toFixed(1)}°`);
                    resolve();
                }
            });
        });
    }

    handleWin() {
        this.gameOver = true;
        this.score += 1; // Award 1 point for reaching destination
        console.log(`Congratulations! You reached ${this.destination.name}!`);
        
        // Update score display
        if (window.blocklySystem && window.blocklySystem.updateScore) {
            window.blocklySystem.updateScore(this.score);
        }
        
        // Show Lottie win animation
        const overlay = document.getElementById('win-overlay');
        const message = document.getElementById('win-message');
        message.textContent = `Good job. You found ${this.destination.name}! +1 Point!`;
        
        overlay.style.display = 'flex';
        
        // Play animation
        if (window.winAnimation) {
            window.winAnimation.play();
        }
        
        // Auto-start new game after 3 seconds
        this.time.delayedCall(3000, () => {
            overlay.style.display = 'none';
            if (window.winAnimation) {
                window.winAnimation.stop();
            }
            this.initializeGame(); // Start new game with new start/destination
        });
    }

    handleFailure() {
        console.log('Player did not reach destination');
        
        // Show Lottie lose animation
        const overlay = document.getElementById('lose-overlay');
        const message = document.getElementById('lose-message');
        message.textContent = 'Sorry. Try again!'; // Don't reveal the destination name
        
        overlay.style.display = 'flex';
        
        // Play animation
        if (window.loseAnimation) {
            window.loseAnimation.play();
        }
        
        // Reset player to starting position after 2 seconds
        this.time.delayedCall(2000, () => {
            overlay.style.display = 'none';
            if (window.loseAnimation) {
                window.loseAnimation.stop();
            }
            this.resetToStart();
        });
    }

    checkSpinEasterEgg() {
        // Keep only the last 6 turns
        if (this.turnSequence.length > 6) {
            this.turnSequence = this.turnSequence.slice(-6);
        }
        
        // Minimum of 4 turns required
        if (this.turnSequence.length >= 4) {
            // Check for alternating pattern (left-right-left-right or right-left-right-left)
            let isAlternating = true;
            for (let i = 1; i < this.turnSequence.length; i++) {
                if (this.turnSequence[i] === this.turnSequence[i - 1]) {
                    isAlternating = false;
                    break;
                }
            }
            
            // Check for repeating pattern (left-left-left-left or right-right-right-right)
            let isRepeating = true;
            const firstTurn = this.turnSequence[this.turnSequence.length - 1];
            for (let i = this.turnSequence.length - 4; i < this.turnSequence.length; i++) {
                if (this.turnSequence[i] !== firstTurn) {
                    isRepeating = false;
                    break;
                }
            }
            
            if (isAlternating) {
                console.log('🎉 Easter egg triggered! Player is spinning around (alternating)!');
                this.triggerSpinEasterEgg();
            } else if (isRepeating) {
                console.log('🎉 Easter egg triggered! Player is going in circles (repeating)!');
                this.triggerSpinEasterEgg();
            }
        }
    }

    triggerSpinEasterEgg() {
        // Clear the turn sequence
        this.turnSequence = [];
        
        // Stop any ongoing execution
        this.isExecuting = false;
        this.gameOver = true;
        
        // Deduct a point (but don't go below 0)
        if (this.score > 0) {
            this.score--;
            const scoreValue = document.getElementById('score-value');
            if (scoreValue) {
                scoreValue.textContent = this.score;
            }
        }
        
        // Create overlay div for the gif
        const overlay = document.createElement('div');
        overlay.id = 'easter-egg-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const gif = document.createElement('img');
        gif.src = 'assets/images/-1.gif';
        gif.style.cssText = `
            max-width: 80%;
            max-height: 80%;
            border-radius: 10px;
            box-shadow: 0 0 30px rgba(255, 255, 255, 0.5);
        `;
        
        overlay.appendChild(gif);
        document.body.appendChild(overlay);
        
        // Remove overlay after 3 seconds and reset player
        setTimeout(() => {
            overlay.remove();
            this.resetToStart();
        }, 3000);
    }

    resetToStart() {
        if (!this.startingPosition) return;
        
        // Reset turn sequence for easter egg
        this.turnSequence = [];
        
        // Reset player to starting position
        this.currentPlayerPosition = { ...this.startingPosition };
        this.targetPlayerPosition = { ...this.currentPlayerPosition };
        this.updatePlayerSprite();
        this.updateCurrentConnections();
        this.setInitialPlayerDirection();
        
        // Highlight the player after a brief delay to ensure sprite is fully updated
        this.time.delayedCall(100, () => {
            this.highlightPlayer();
        });
        
        // Reset game state
        this.gameOver = false;
        this.isMoving = false;
        
        console.log('Player reset to starting position');
    }

    // Utility methods for debugging
    toggleShowPoints() {
        this.showPoints = !this.showPoints;
        this.drawDebugInfo();
    }

    toggleShowPaths() {
        this.showPaths = !this.showPaths;
        this.drawDebugInfo();
    }
}

// Game configuration - now responsive to container size
function getGameConfig() {
    const gameContainer = document.getElementById('game-container');
    const containerWidth = gameContainer ? gameContainer.clientWidth : 960;
    const containerHeight = gameContainer ? gameContainer.clientHeight : 540;
    
    return {
        type: Phaser.AUTO,
        width: containerWidth,
        height: containerHeight,
        parent: 'game-container',
        backgroundColor: '#FFFFFF',
        scene: GameScene,
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 },
                debug: false
            }
        },
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH
        }
    };
}

// Initialize the game
let game = null;

function initGame() {
    if (game) {
        game.destroy(true);
    }
    game = new Phaser.Game(getGameConfig());
    
    // Add to global scope for debugging
    window.game = game;
    window.gameScene = null;
    
    // Wait for the scene to be added before accessing its events
    game.events.once('ready', () => {
        const scene = game.scene.getScene('GameScene');
        if (scene && scene.events) {
            scene.events.on('create', () => {
                window.gameScene = scene;
            });
        } else {
            // Fallback: set gameScene after a delay
            setTimeout(() => {
                window.gameScene = game.scene.getScene('GameScene');
            }, 100);
        }
    });
    
    return game;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameScene, gameConfig, initGame };
}
