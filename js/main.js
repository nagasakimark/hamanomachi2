// Main application entry point
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Hamanomachi Block Programming Game...');
    
    // Load the Hamanomachi game module first
    const gameScript = document.createElement('script');
    gameScript.src = 'js/game-hamanomachi.js';
    gameScript.onload = () => {
        // Initialize the game after the script loads
        initGame(); // initGame now handles everything internally
        
        // Wait for game to be fully ready before initializing Blockly
        const checkGameReady = () => {
            if (window.gameScene && window.gameScene.mapData && window.gameScene.currentPlayerPosition) {
                // Game is ready, initialize Blockly
                try {
                    const blocklySystem = initBlocklySystem();
                    console.log('Hamanomachi game and Blockly system initialized successfully!');
                    
                    // Welcome message removed - using goal/score display instead
                    
                    // Store reference globally for debugging
                    window.blocklySystem = blocklySystem;
                } catch (error) {
                    console.error('Failed to initialize Blockly system:', error);
                    showErrorMessage('Failed to initialize Blockly. Some features may not work.');
                }
            } else {
                // Game not ready yet, check again
                setTimeout(checkGameReady, 100);
            }
        };
        
        // Start checking for game readiness
        setTimeout(checkGameReady, 200);
    };
    
    gameScript.onerror = () => {
        console.error('Failed to load Hamanomachi game module');
        showErrorMessage('Failed to load game. Please refresh the page.');
    };
    
    document.head.appendChild(gameScript);
});

// Blockly system initialization function
function initBlocklySystem() {
    const blocklySystem = new BlocklySystem('blocklyDiv');
    // Add global reference for game integration
    window.blocklySystem = blocklySystem;
    return blocklySystem;
}

function showWelcomeMessage() {
    // Welcome message disabled - using goal/score display instead
}

function showErrorMessage(text) {
    const container = document.getElementById('container');
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #e74c3c;
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 1000;
        font-weight: bold;
        text-align: center;
    `;
    errorDiv.textContent = text;
    document.body.appendChild(errorDiv);
}

// Handle window resize with debouncing
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const game = window.GameAPI?.getGame();
        if (game) {
            // Force refresh the game scale
            game.scale.refresh();
            
            // Recalculate camera zoom for new size
            const scene = window.GameAPI?.getScene();
            if (scene) {
                const gameWidth = game.config.width;
                const gameHeight = game.config.height;
                const worldWidth = scene.mapWidth * scene.gridSize;
                const worldHeight = scene.mapHeight * scene.gridSize;
                
                const zoomX = gameWidth / worldWidth;
                const zoomY = gameHeight / worldHeight;
                const optimalZoom = Math.min(zoomX, zoomY) * 0.9;
                
                scene.cameras.main.setZoom(optimalZoom);
                scene.cameras.main.centerOn(worldWidth / 2, worldHeight / 2);
            }
        }
        
        // Resize Blockly workspace
        if (window.blocklySystem) {
            window.blocklySystem.resizeWorkspace();
        }
    }, 100); // Debounce resize events
});

// Handle visibility change (pause game when tab is not visible)
document.addEventListener('visibilitychange', function() {
    const game = window.GameAPI?.getGame();
    if (game) {
        if (document.hidden) {
            game.scene.pause('GameScene');
        } else {
            game.scene.resume('GameScene');
        }
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Prevent default behavior for game-related keys
    if (['Space', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
    }
    
    const gameScene = window.GameAPI?.getScene();
    if (!gameScene) return;
    
    switch(e.code) {
        case 'Space':
        case 'Enter':
            // Run program
            if (window.blocklySystem) {
                window.blocklySystem.executeProgram();
            }
            break;
        case 'Escape':
            // Stop program
            if (window.blocklySystem) {
                window.blocklySystem.stopProgram();
            }
            break;
        case 'KeyR':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                // Reset game
                if (window.blocklySystem) {
                    window.blocklySystem.resetGame();
                }
            }
            break;
        case 'KeyC':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                // Clear workspace
                if (window.blocklySystem) {
                    window.blocklySystem.clearWorkspace();
                }
            }
            break;
    }
});

// Add keyboard help
function showKeyboardHelp() {
    const helpText = `
        <strong>Keyboard Shortcuts:</strong><br>
        <em>Space/Enter:</em> Run Program<br>
        <em>Escape:</em> Stop Program<br>
        <em>Ctrl+R:</em> Reset Game<br>
        <em>Ctrl+C:</em> Clear All Blocks<br>
        <br>
        <strong>Blockly Tips:</strong><br>
        <em>Drag blocks from the toolbox<br>
        <em>Connect blocks together<br>
        <em>Use the repeat block for loops<br>
        <em>Right-click blocks for options
    `;
    
    const helpDiv = document.createElement('div');
    helpDiv.className = 'status-message';
    helpDiv.innerHTML = helpText;
    helpDiv.style.fontSize = '0.8em';
    
    const blocksPanel = document.getElementById('blocks-panel');
    blocksPanel.appendChild(helpDiv);
    
    setTimeout(() => {
        if (helpDiv.parentNode) {
            helpDiv.remove();
        }
    }, 10000);
}

// Help button removed - not needed

// Error handling
window.addEventListener('error', function(e) {
    console.error('Game error:', e.error);
    showErrorMessage('An error occurred. Please check the console and refresh the page.');
});

// Global functions for debugging Hamanomachi game
window.gameDebug = {
    getGameState: () => {
        const scene = window.gameScene;
        if (scene) {
            return {
                currentPosition: scene.currentPlayerPosition,
                destination: scene.destination,
                playerAngle: scene.playerAngle,
                isMoving: scene.isMoving,
                isExecuting: scene.isExecuting,
                availableConnections: scene.currentConnections.length,
                gameOver: scene.gameOver
            };
        }
        return null;
    },
    
    teleportPlayer: (x, y) => {
        const scene = window.gameScene;
        if (scene && scene.mapData) {
            // Find the closest point to the given coordinates
            let closestPoint = null;
            let minDistance = Infinity;
            
            scene.mapData.points.forEach(point => {
                const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = point;
                }
            });
            
            if (closestPoint) {
                scene.currentPlayerPosition = { ...closestPoint };
                scene.targetPlayerPosition = { ...closestPoint };
                scene.updatePlayerSprite();
                scene.updateCurrentConnections();
                console.log('Teleported to:', closestPoint);
            }
        }
    },
    
    showDestinations: () => {
        const scene = window.gameScene;
        if (scene && scene.mapData) {
            const destinations = scene.mapData.points.filter(p => p.type === 'destination');
            console.log('Available destinations:');
            destinations.forEach((dest, index) => {
                console.log(`${index + 1}. ${dest.name} at (${dest.x}, ${dest.y})`);
            });
            return destinations;
        }
        return [];
    },
    
    toggleDebugDisplay: () => {
        const scene = window.gameScene;
        if (scene) {
            scene.showPoints = !scene.showPoints;
            scene.showPaths = !scene.showPaths;
            scene.drawDebugInfo();
            console.log(`Debug display: Points=${scene.showPoints}, Paths=${scene.showPaths}`);
        }
    },
    
    addTestProgram: () => {
        if (window.blocklySystem && window.blocklySystem.workspace) {
            window.blocklySystem.clearWorkspace();
            
            // Add a test program with XML using modern API
            try {
                let xml;
                // Try modern API first, fall back to legacy if needed
                if (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom) {
                    xml = Blockly.utils.xml.textToDom(`
                        <xml xmlns="https://developers.google.com/blockly/xml">
                            <block type="repeat_times" x="20" y="20">
                                <field name="TIMES">3</field>
                                <statement name="DO">
                                    <block type="go_straight">
                                        <field name="STEPS">2</field>
                                        <next>
                                            <block type="turn_right"></block>
                                        </next>
                                    </block>
                                </statement>
                                <next>
                                    <block type="look_left"></block>
                                </next>
                            </block>
                        </xml>
                    `);
                } else if (Blockly.Xml && Blockly.Xml.textToDom) {
                    xml = Blockly.Xml.textToDom(`
                        <xml xmlns="https://developers.google.com/blockly/xml">
                            <block type="repeat_times" x="20" y="20">
                                <field name="TIMES">3</field>
                                <statement name="DO">
                                    <block type="go_straight">
                                        <field name="STEPS">2</field>
                                        <next>
                                            <block type="turn_right"></block>
                                        </next>
                                    </block>
                                </statement>
                                <next>
                                    <block type="look_left"></block>
                                </next>
                            </block>
                        </xml>
                    `);
                }
                
                if (xml) {
                    Blockly.Xml.domToWorkspace(xml, window.blocklySystem.workspace);
                } else {
                    // Manual creation fallback
                    const block = window.blocklySystem.workspace.newBlock('go_straight');
                    block.setFieldValue('2', 'STEPS');
                    block.moveBy(20, 20);
                    block.initSvg();
                    block.render();
                }
            } catch (error) {
                console.log('Could not load test program:', error);
                // Fallback: just add a simple block
                try {
                    const block = window.blocklySystem.workspace.newBlock('go_straight');
                    block.moveBy(20, 20);
                    block.initSvg();
                    block.render();
                } catch (fallbackError) {
                    console.log('Could not create test blocks:', fallbackError);
                }
            }
        }
    }
};

console.log('Main application loaded. Use window.gameDebug for debugging functions.');