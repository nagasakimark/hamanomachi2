// Touch event polyfill for Blockly
// Converts touch events to pointer events that Blockly handles better
// Always enabled to support all devices, including those that don't properly identify as touch devices

(function() {
    'use strict';
    
    console.log('Touch polyfill activated for all devices');
    
    // Map touch events to mouse events
    const touchEventMap = {
        'touchstart': 'mousedown',
        'touchmove': 'mousemove',
        'touchend': 'mouseup'
    };
    
    function touchToMouse(touchEvent) {
        const touch = touchEvent.changedTouches[0];
        const mouseEvent = new MouseEvent(touchEventMap[touchEvent.type], {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: touch.clientX,
            clientY: touch.clientY,
            screenX: touch.screenX,
            screenY: touch.screenY,
            button: 0,
            buttons: 1
        });
        
        touch.target.dispatchEvent(mouseEvent);
    }
    
    // Wait for Blockly div to be available
    function initPolyfill() {
        const blocklyDiv = document.getElementById('blocklyDiv');
        
        if (!blocklyDiv) {
            setTimeout(initPolyfill, 100);
            return;
        }
        
        console.log('Installing touch event handlers on Blockly workspace');
        
        // Intercept touch events and convert to mouse events
        ['touchstart', 'touchmove', 'touchend'].forEach(eventType => {
            blocklyDiv.addEventListener(eventType, function(e) {
                // Only convert if touching a block or workspace
                const target = e.target;
                const isBlocklyElement = target.closest('.blocklyWorkspace') || 
                                        target.closest('.blocklyDraggable') ||
                                        target.classList.contains('blocklyWorkspace') ||
                                        target.classList.contains('blocklyDraggable');
                
                if (isBlocklyElement) {
                    e.preventDefault();
                    touchToMouse(e);
                }
            }, { passive: false, capture: true });
        });
        
        console.log('Touch polyfill installed successfully');
    }
    
    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPolyfill);
    } else {
        initPolyfill();
    }
})();
