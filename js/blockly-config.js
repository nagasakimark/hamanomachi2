// Blockly configuration and custom blocks for the game

// Define custom blocks with bright, kid-friendly colors
Blockly.defineBlocksWithJsonArray([
    // Go Straight block
    {
        "type": "go_straight",
        "message0": "go straight for %1 block",
        "args0": [
            {
                "type": "field_number",
                "name": "STEPS",
                "value": 1,
                "min": 1,
                "max": 10,
                "precision": 1
            }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "colour": "#FF0000", // Bright red
        "tooltip": "Move the character forward by the specified number of blocks",
        "helpUrl": ""
    },

    // Go Straight for a Little Bit block
    {
        "type": "go_straight_littlebit",
        "message0": "go straight for a little bit",
        "previousStatement": null,
        "nextStatement": null,
        "colour": "#FF6B6B", // Slightly different red/pink
        "tooltip": "Move the character forward stopping at the next littlebit point",
        "helpUrl": ""
    },
    
    // Turn Left block
    {
        "type": "turn_left",
        "message0": "turn left",
        "previousStatement": null,
        "nextStatement": null,
        "colour": "#00FF00", // Bright green
        "tooltip": "Turn the character 90 degrees to the left",
        "helpUrl": ""
    },
    
    // Turn Right block
    {
        "type": "turn_right",
        "message0": "turn right",
        "previousStatement": null,
        "nextStatement": null,
        "colour": "#0000FF", // Bright blue
        "tooltip": "Turn the character 90 degrees to the right",
        "helpUrl": ""
    },
    
    // Look Left block
    {
        "type": "look_left",
        "message0": "you can see it on your left",
        "previousStatement": null,
        "nextStatement": null,
        "colour": "#FF8000", // Bright orange
        "tooltip": "Turn left and move forward one block",
        "helpUrl": ""
    },
    
    // Look Right block
    {
        "type": "look_right",
        "message0": "you can see it on your right",
        "previousStatement": null,
        "nextStatement": null,
        "colour": "#8000FF", // Bright purple
        "tooltip": "Turn right and move forward one block",
        "helpUrl": ""
    }
]);

// Custom field class for dynamic singular/plural text
class PluralNumberField extends Blockly.FieldNumber {
    constructor(value, min, max, precision, opt_validator) {
        super(value, min, max, precision, opt_validator);
        this.singularWord = 'block';
        this.pluralWord = 'blocks';
    }
    
    setValue(newValue) {
        super.setValue(newValue);
        // Update the block's message when value changes
        if (this.sourceBlock_) {
            const steps = parseInt(newValue) || 1;
            const word = steps === 1 ? this.singularWord : this.pluralWord;
            this.sourceBlock_.inputList[0].fieldRow[0].setValue(`go straight for `);
            this.sourceBlock_.inputList[0].fieldRow[2].setValue(` ${word}`);
        }
    }
}

// Override the go_straight block to use dynamic text
Blockly.Blocks['go_straight'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("go straight for ")
            .appendField(new Blockly.FieldNumber(1, 1, 10, 1), "STEPS")
            .appendField(" block");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour("#FF0000");
        this.setTooltip("Move the character forward by the specified number of blocks");
        
        // Update text when field changes
        const stepsField = this.getField('STEPS');
        const blockField = this.inputList[0].fieldRow[2];
        
        if (stepsField && blockField) {
            stepsField.setValidator((newValue) => {
                const steps = parseInt(newValue) || 1;
                const word = steps === 1 ? ' block' : ' blocks';
                blockField.setValue(word);
                return newValue;
            });
        }
    }
};

// Override the go_straight_littlebit block
Blockly.Blocks['go_straight_littlebit'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("go straight for a little bit");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour("#FF6B6B");
        this.setTooltip("Move the character forward stopping at the next littlebit point");
    }
};

// Code generators for JavaScript
const javascriptGenerator = Blockly.JavaScript;

// Modern generator registration
javascriptGenerator.forBlock['go_straight'] = function(block) {
    const steps = block.getFieldValue('STEPS');
    return `executeCommand('move-forward', ${steps});\n`;
};

javascriptGenerator.forBlock['go_straight_littlebit'] = function(block) {
    return `executeCommand('move-forward-littlebit', 1);\n`;
};

javascriptGenerator.forBlock['turn_left'] = function(block) {
    return `executeCommand('turn-left');\n`;
};

javascriptGenerator.forBlock['turn_right'] = function(block) {
    return `executeCommand('turn-right');\n`;
};

javascriptGenerator.forBlock['look_left'] = function(block) {
    return `executeCommand('look-left');\n`;
};

javascriptGenerator.forBlock['look_right'] = function(block) {
    return `executeCommand('look-right');\n`;
};

// Legacy generator registration (fallback)
Blockly.JavaScript['go_straight'] = javascriptGenerator.forBlock['go_straight'];
Blockly.JavaScript['go_straight_littlebit'] = javascriptGenerator.forBlock['go_straight_littlebit'];
Blockly.JavaScript['turn_left'] = javascriptGenerator.forBlock['turn_left'];
Blockly.JavaScript['turn_right'] = javascriptGenerator.forBlock['turn_right'];
Blockly.JavaScript['look_left'] = javascriptGenerator.forBlock['look_left'];
Blockly.JavaScript['look_right'] = javascriptGenerator.forBlock['look_right'];

// Blockly workspace configuration
const blocklyConfig = {
    toolbox: {
        "kind": "categoryToolbox",
        "contents": [
            {
                "kind": "category",
                "name": "Blocks",
                "categorystyle": "game_category",
                "contents": [
                    {
                        "kind": "block",
                        "type": "go_straight"
                    },
                    {
                        "kind": "block",
                        "type": "go_straight_littlebit"
                    },
                    {
                        "kind": "block",
                        "type": "turn_left"
                    },
                    {
                        "kind": "block",
                        "type": "turn_right"
                    },
                    {
                        "kind": "block",
                        "type": "look_left"
                    },
                    {
                        "kind": "block",
                        "type": "look_right"
                    }
                ]
            }
        ]
    },

    collapse: true,
    comments: true,
    disable: true,
    maxBlocks: Infinity,
    trashcan: true,
    horizontalLayout: false,
    toolboxPosition: 'start',
    css: true,
    media: 'https://unpkg.com/blockly/media/',
    rtl: false,
    scrollbars: {
        horizontal: false,  // Disable horizontal scrolling
        vertical: true      // Keep vertical scrolling
    },
    sounds: true,
    oneBasedIndex: true,
    grid: {
        spacing: 20,
        length: 3,
        colour: '#ccc',
        snap: true
    },
    zoom: {
        controls: false,  // Disable zoom controls
        wheel: false,     // Disable mouse wheel zoom
        startScale: 1.3,  // Start at 130% zoom for closer view
        maxScale: 1.3,    // Lock max zoom to 1.3
        minScale: 1.3,    // Lock min zoom to 1.3
        scaleSpeed: 1.0
    },
    theme: Blockly.Theme.defineTheme('kidFriendly', {
        'base': Blockly.Themes.Classic,
        'categoryStyles': {
            'game_category': {
                'colour': '#FF6B6B'
            }
        }
    }),
    move: {
        scrollbars: {
            horizontal: false,
            vertical: true
        },
        drag: false,  // Disable workspace dragging to fix touch issues
        wheel: false
    }
};

// Blockly System class
class BlocklySystem {
    constructor() {
        this.workspace = null;
        this.commandQueue = [];
        this.isExecuting = false;
        
        this.initializeBlockly();
        this.setupEventListeners();
    }
    
    initializeBlockly() {
        const blocklyDiv = document.getElementById('blocklyDiv');
        if (blocklyDiv) {
            try {
                // Force Blockly to recognize touch support
                if (Blockly.Touch) {
                    Blockly.Touch.TOUCH_ENABLED = true;
                }
                
                this.workspace = Blockly.inject(blocklyDiv, blocklyConfig);
                
                // Fix touch events for mobile devices
                this.setupTouchEventHandling();
                
                // Add custom boundary checking for blocks
                this.setupBlockBoundaries();
                
                // Setup resize handler
                this.setupResizeHandler();
                
                // Add custom icon to category after initialization
                setTimeout(() => {
                    this.addCustomCategoryIcon();
                }, 100);
                
                // Verify generators are properly registered
                console.log('Checking JavaScript generators:');
                console.log('go_straight:', javascriptGenerator.forBlock['go_straight'] ? 'OK' : 'MISSING');
                console.log('go_straight_littlebit:', javascriptGenerator.forBlock['go_straight_littlebit'] ? 'OK' : 'MISSING');
                console.log('turn_left:', javascriptGenerator.forBlock['turn_left'] ? 'OK' : 'MISSING');
                console.log('turn_right:', javascriptGenerator.forBlock['turn_right'] ? 'OK' : 'MISSING');
                console.log('look_left:', javascriptGenerator.forBlock['look_left'] ? 'OK' : 'MISSING');
                console.log('look_right:', javascriptGenerator.forBlock['look_right'] ? 'OK' : 'MISSING');
                
                // Add some sample blocks to get started
                this.addSampleProgram();
                
                // Listen for workspace changes
                this.workspace.addChangeListener(() => {
                    this.onWorkspaceChange();
                });
                
                // Set up mutation observer to catch any scrollbars that appear
                this.setupScrollbarObserver();
                
                // Periodically check flyout state to manage scrollbars
                this.startFlyoutMonitoring();
                
                console.log('Blockly workspace initialized successfully');
            } catch (error) {
                console.error('Failed to initialize Blockly:', error);
                this.showMessage('Failed to initialize Blockly. Please refresh the page.');
            }
        } else {
            console.error('Could not find blocklyDiv element');
        }
    }
    
    setupTouchEventHandling() {
        // Disable workspace scrolling/panning which causes blocks to disappear on touch
        if (this.workspace && this.workspace.options) {
            this.workspace.options.moveOptions = this.workspace.options.moveOptions || {};
            this.workspace.options.moveOptions.drag = false;
            this.workspace.options.moveOptions.wheel = false;
        }
        console.log('Touch event handling configured for Blockly');
    }
    
    setupBlockBoundaries() {
        // Block boundaries disabled - not needed for touch devices
        // The workspace will naturally constrain blocks
    }
    
    constrainBlockToWorkspace(block) {
        const blockPosition = block.getRelativeToSurfaceXY();
        const workspaceMetrics = this.workspace.getMetrics();
        
        // Safety check: if metrics are invalid, trigger a resize
        if (!workspaceMetrics.viewWidth || !workspaceMetrics.viewHeight || 
            workspaceMetrics.viewWidth < 100 || workspaceMetrics.viewHeight < 100) {
            console.warn('Invalid workspace metrics detected, triggering resize');
            this.resizeWorkspace();
            return;
        }
        
        const blockSize = block.getHeightWidth();
        
        // Define workspace boundaries with some padding
        const padding = 20;
        const leftBound = padding;
        const rightBound = workspaceMetrics.viewWidth - blockSize.width - padding;
        const topBound = padding;
        const bottomBound = workspaceMetrics.viewHeight - blockSize.height - padding;
        
        let newX = blockPosition.x;
        let newY = blockPosition.y;
        let moved = false;
        
        // Constrain horizontal position
        if (newX < leftBound) {
            newX = leftBound;
            moved = true;
        } else if (newX > rightBound) {
            newX = rightBound;
            moved = true;
        }
        
        // Constrain vertical position
        if (newY < topBound) {
            newY = topBound;
            moved = true;
        } else if (newY > bottomBound) {
            newY = bottomBound;
            moved = true;
        }
        
        // Move block back to valid area if it was outside
        if (moved) {
            block.moveBy(newX - blockPosition.x, newY - blockPosition.y);
        }
    }
    
    startFlyoutMonitoring() {
        // Check flyout state periodically to manage scrollbar visibility
        setInterval(() => {
            this.manageFlyoutScrollbars();
        }, 500); // Check every 500ms
    }

    manageFlyoutScrollbars() {
        // Hide flyout scrollbars when flyout is closed
        setTimeout(() => {
            const flyout = document.querySelector('.blocklyFlyout');
            const flyoutScrollbars = document.querySelectorAll('.blocklyScrollbarVertical');
            
            if (flyout) {
                // Check multiple indicators of flyout visibility
                const isVisible = flyout.style.display !== 'none' && 
                                flyout.style.visibility !== 'hidden' &&
                                flyout.getAttribute('aria-hidden') !== 'true' &&
                                flyout.offsetWidth > 0 && 
                                flyout.offsetHeight > 0;
                
                // Hide ALL vertical scrollbars when flyout is closed
                flyoutScrollbars.forEach(scrollbar => {
                    if (isVisible) {
                        // Only show if the flyout actually needs scrolling
                        const flyoutContent = flyout.querySelector('.blocklyFlyoutBackground');
                        if (flyoutContent && flyoutContent.scrollHeight > flyoutContent.clientHeight) {
                            scrollbar.style.display = 'block';
                            scrollbar.style.opacity = '1';
                        } else {
                            scrollbar.style.display = 'none';
                            scrollbar.style.opacity = '0';
                        }
                    } else {
                        scrollbar.style.display = 'none';
                        scrollbar.style.opacity = '0';
                        scrollbar.style.visibility = 'hidden';
                    }
                });
            } else {
                // If no flyout found, hide all scrollbars
                flyoutScrollbars.forEach(scrollbar => {
                    scrollbar.style.display = 'none';
                    scrollbar.style.opacity = '0';
                    scrollbar.style.visibility = 'hidden';
                });
            }
        }, 50);
    }
    
    setupScrollbarObserver() {
        // Watch for any new scrollbars being added to the DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Check if it's a scrollbar
                        if (node.classList && node.classList.contains('blocklyScrollbarVertical')) {
                            // Hide all scrollbars by default, let manageFlyoutScrollbars handle visibility
                            node.style.display = 'none';
                            node.style.opacity = '0';
                            node.style.visibility = 'hidden';
                            
                            // Then check if it should be visible
                            setTimeout(() => this.manageFlyoutScrollbars(), 10);
                        }
                        
                        // Also check child elements for scrollbars
                        const scrollbars = node.querySelectorAll('.blocklyScrollbarVertical');
                        scrollbars.forEach(scrollbar => {
                            scrollbar.style.display = 'none';
                            scrollbar.style.opacity = '0';
                            scrollbar.style.visibility = 'hidden';
                            
                            setTimeout(() => this.manageFlyoutScrollbars(), 10);
                        });
                    }
                });
            });
        });
        
        // Observe the entire Blockly div for changes
        const blocklyDiv = document.getElementById('blocklyDiv');
        if (blocklyDiv) {
            observer.observe(blocklyDiv, {
                childList: true,
                subtree: true
            });
        }
    }

    addCustomCategoryIcon() {
        // Find the category and add a custom icon
        const categoryElement = document.querySelector('.blocklyTreeRow');
        if (categoryElement) {
            const iconElement = categoryElement.querySelector('.blocklyTreeIcon');
            if (iconElement) {
                // Create a colorful game controller icon using CSS
                iconElement.innerHTML = `
                    <div style="
                        width: 20px; 
                        height: 20px; 
                        background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
                        border-radius: 50%;
                        position: relative;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: bold;
                        font-size: 12px;
                    ">🎮</div>
                `;
            }
        }
    }
    
    setupEventListeners() {
        // Run program button
        const runButton = document.getElementById('run-blockly');
        if (runButton) {
            runButton.addEventListener('click', () => {
                this.executeProgram();
            });
        }
        
        // Clear blocks button
        const clearButton = document.getElementById('clear-blockly');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.clearWorkspace();
            });
        }
        
        // Show code button
        const showCodeButton = document.getElementById('show-code');
        if (showCodeButton) {
            showCodeButton.addEventListener('click', () => {
                this.toggleCodeDisplay();
            });
        }
        
        // Game control buttons
        const stopButton = document.getElementById('stop-button');
        const resetButton = document.getElementById('reset-button');
        
        if (stopButton) {
            stopButton.addEventListener('click', () => {
                this.stopProgram();
            });
        }
        
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetGame();
            });
        }
    }
    
    addSampleProgram() {
        // Add a simple example program using the modern API
        try {
            let xml;
            // Try modern API first, fall back to legacy if needed
            if (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom) {
                xml = Blockly.utils.xml.textToDom(`
                    <xml xmlns="https://developers.google.com/blockly/xml">
                        <block type="go_straight" x="20" y="20">
                            <field name="STEPS">2</field>
                            <next>
                                <block type="turn_right">
                                    <next>
                                        <block type="go_straight">
                                            <field name="STEPS">1</field>
                                            <next>
                                                <block type="look_left"></block>
                                            </next>
                                        </block>
                                    </next>
                                </block>
                            </next>
                        </block>
                    </xml>
                `);
            } else if (Blockly.Xml && Blockly.Xml.textToDom) {
                xml = Blockly.Xml.textToDom(`
                    <xml xmlns="https://developers.google.com/blockly/xml">
                        <block type="go_straight" x="20" y="20">
                            <field name="STEPS">2</field>
                            <next>
                                <block type="turn_right">
                                    <next>
                                        <block type="go_straight">
                                            <field name="STEPS">1</field>
                                            <next>
                                                <block type="look_left"></block>
                                            </next>
                                        </block>
                                    </next>
                                </block>
                            </next>
                        </block>
                    </xml>
                `);
            } else {
                // Manual block creation as fallback
                console.log('Using manual block creation fallback');
                const block = this.workspace.newBlock('go_straight');
                block.setFieldValue('2', 'STEPS');
                block.moveBy(20, 20);
                block.initSvg();
                block.render();
                return;
            }
            
            if (xml) {
                Blockly.Xml.domToWorkspace(xml, this.workspace);
            }
        } catch (error) {
            console.log('Could not add sample program:', error);
            // Try to add at least one block manually
            try {
                const block = this.workspace.newBlock('go_straight');
                block.moveBy(20, 20);
                block.initSvg();
                block.render();
            } catch (fallbackError) {
                console.log('Could not create any blocks:', fallbackError);
            }
        }
    }
    
    onWorkspaceChange() {
        // Update code display if it's visible
        const codeDisplay = document.getElementById('code-display');
        if (codeDisplay && codeDisplay.style.display !== 'none') {
            this.updateCodeDisplay();
        }
    }
    
    executeProgram() {
        if (this.isExecuting) {
            this.showMessage('Program is already running!');
            return;
        }
        
        if (!this.workspace) {
            this.showMessage('Blockly workspace not ready!');
            return;
        }
        
        // Generate JavaScript code from blocks
        let code;
        try {
            // Try modern approach first
            if (javascriptGenerator && typeof javascriptGenerator.workspaceToCode === 'function') {
                code = javascriptGenerator.workspaceToCode(this.workspace);
            } else if (Blockly.JavaScript && typeof Blockly.JavaScript.workspaceToCode === 'function') {
                // Fallback to legacy approach
                code = Blockly.JavaScript.workspaceToCode(this.workspace);
            } else {
                throw new Error('No JavaScript generator available');
            }
        } catch (error) {
            console.error('Error generating code:', error);
            this.showMessage('Error generating code from blocks. Check console for details.');
            return;
        }
        
        if (!code.trim()) {
            this.showMessage('No blocks to execute! Add some blocks first.');
            return;
        }
        
        this.isExecuting = true;
        this.commandQueue = [];
        
        // Define executeCommand function for the generated code
        window.executeCommand = (type, value = 1) => {
            this.commandQueue.push({ type, value });
        };
        
        try {
            // Execute the generated code to build command queue
            eval(code);
            
            // Execute the commands in the game
            const gameScene = window.gameScene;
            if (gameScene && gameScene.executeCommandQueue) {
                gameScene.executeCommandQueue(this.commandQueue)
                    .then(() => {
                        this.showMessage('Program completed successfully!');
                        this.isExecuting = false;
                    })
                    .catch((error) => {
                        console.error('Error during program execution:', error);
                        this.showMessage('Error during program execution.');
                        this.isExecuting = false;
                    });
                this.showMessage(`Executing program with ${this.commandQueue.length} commands...`);
            } else {
                this.showMessage('Game not ready. Please wait and try again.');
                this.isExecuting = false;
            }
        } catch (error) {
            console.error('Error executing program:', error);
            this.showMessage('Error in program execution. Check your blocks.');
            this.isExecuting = false;
        }
        
        // Clean up
        delete window.executeCommand;
    }
    
    stopProgram() {
        this.isExecuting = false;
        const gameScene = window.GameAPI?.getScene();
        if (gameScene) {
            gameScene.stopExecution();
            this.showMessage('Program execution stopped.');
        }
    }
    
    resetGame() {
        this.stopProgram();
        const gameScene = window.GameAPI?.getScene();
        if (gameScene) {
            gameScene.resetPlayer();
            this.showMessage('Game reset. Character returned to starting position.');
        }
    }
    
    clearWorkspace() {
        if (this.workspace) {
            this.workspace.clear();
            this.showMessage('All blocks cleared.');
        }
    }
    
    toggleCodeDisplay() {
        const codeDisplay = document.getElementById('code-display');
        if (codeDisplay.style.display === 'none') {
            codeDisplay.style.display = 'block';
            this.updateCodeDisplay();
            document.getElementById('show-code').textContent = 'Hide Code';
        } else {
            codeDisplay.style.display = 'none';
            document.getElementById('show-code').textContent = 'Show Code';
        }
    }
    
    updateCodeDisplay() {
        if (!this.workspace) return;
        
        try {
            let code;
            // Try modern approach first
            if (javascriptGenerator && typeof javascriptGenerator.workspaceToCode === 'function') {
                code = javascriptGenerator.workspaceToCode(this.workspace);
            } else if (Blockly.JavaScript && typeof Blockly.JavaScript.workspaceToCode === 'function') {
                // Fallback to legacy approach
                code = Blockly.JavaScript.workspaceToCode(this.workspace);
            } else {
                code = '// Code generator not available';
            }
            
            const codeContent = document.getElementById('code-content');
            if (codeContent) {
                codeContent.textContent = code || '// No blocks yet...';
            }
        } catch (error) {
            console.error('Error updating code display:', error);
            const codeContent = document.getElementById('code-content');
            if (codeContent) {
                codeContent.textContent = '// Error generating code: ' + error.message;
            }
        }
    }
    
    showMessage(text) {
        // Remove existing message
        const existingMessage = document.querySelector('.status-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Create new message
        const message = document.createElement('div');
        message.className = 'status-message';
        message.textContent = text;
        
        // Insert at top of blocks panel
        const blocksPanel = document.getElementById('blocks-panel');
        const firstChild = blocksPanel.firstChild;
        blocksPanel.insertBefore(message, firstChild);
        
        // Remove message after 3 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 3000);
    }
    
    updateDestination(destinationName) {
        // Remove existing destination display
        const existingDestination = document.querySelector('.destination-display');
        if (existingDestination) {
            existingDestination.remove();
        }
        
        // Create destination display
        const destinationDiv = document.createElement('div');
        destinationDiv.className = 'destination-display';
        destinationDiv.innerHTML = `
            <div class="destination-header">🎯 Your Destination</div>
            <div class="destination-name">${destinationName}</div>
            <div class="destination-hint">Use blocks below to navigate!</div>
        `;
        
        // Style the destination display
        destinationDiv.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            text-align: center;
            font-family: Arial, sans-serif;
            border: 3px solid #fff;
        `;
        
        // Style individual elements
        const style = document.createElement('style');
        style.textContent = `
            .destination-header {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 8px;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            }
            .destination-name {
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 5px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.4);
                color: #FFE4B5;
            }
            .destination-hint {
                font-size: 12px;
                opacity: 0.9;
                font-style: italic;
            }
        `;
        document.head.appendChild(style);
        
        // Insert at top of blocks panel
        const blocksPanel = document.getElementById('blocks-panel');
        const firstChild = blocksPanel.firstChild;
        blocksPanel.insertBefore(destinationDiv, firstChild);
    }
    
    resizeWorkspace() {
        if (this.workspace) {
            Blockly.svgResize(this.workspace);
        }
    }
    
    // Handle window resize events
    setupResizeHandler() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.resizeWorkspace();
            }, 250);
        });
        
        // Also handle orientation change for mobile devices
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.resizeWorkspace();
            }, 300);
        });
    }
}

// Initialize Blockly system
let blocklySystem = null;

function initBlocklySystem() {
    if (!blocklySystem) {
        // Check if Blockly is available
        if (typeof Blockly === 'undefined') {
            console.error('Blockly library not loaded');
            throw new Error('Blockly library not available');
        }
        
        blocklySystem = new BlocklySystem();
    }
    return blocklySystem;
}

// Export for global access
window.BlocklySystem = BlocklySystem;
window.initBlocklySystem = initBlocklySystem;

// Add error handling for missing Blockly
window.addEventListener('load', () => {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly failed to load from CDN');
        const errorDiv = document.getElementById('blocklyDiv');
        if (errorDiv) {
            errorDiv.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #e74c3c;">
                    <h4>Blockly Failed to Load</h4>
                    <p>Please check your internet connection and refresh the page.</p>
                    <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 10px;">Refresh Page</button>
                </div>
            `;
        }
    }
});