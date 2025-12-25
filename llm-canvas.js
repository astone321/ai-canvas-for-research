// Node State Management - Single Source of Truth
const NodeState = {
    EXPANDED: { width: 1100, height: 650 },
    BOX: { width: 60, height: 60 },
    MINIMUM_Y: 170,

    // Atomic update that keeps data and DOM in sync
    updateNodeDimensions(node, nodeEl, isBoxView) {
        const dimensions = isBoxView ? this.BOX : this.EXPANDED;
        
        // Update node data
        node.width = dimensions.width;
        node.height = dimensions.height;
        node.isBoxView = isBoxView;
        
        // Update DOM synchronously
        if (nodeEl) {
            nodeEl.style.width = `${dimensions.width}px`;
            nodeEl.style.height = `${dimensions.height}px`;
            nodeEl.style.minWidth = `${dimensions.width}px`;
            nodeEl.style.minHeight = `${dimensions.height}px`;
            
            if (isBoxView) {
                nodeEl.style.maxWidth = `${dimensions.width}px`;
                nodeEl.style.maxHeight = `${dimensions.height}px`;
            } else {
                nodeEl.style.maxWidth = 'none';
                nodeEl.style.maxHeight = 'none';
            }
        }
    },



// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Ensure position is safe
    validatePosition(node) {
        if (node.y < this.MINIMUM_Y) {
            node.y = this.MINIMUM_Y;
            const nodeEl = document.getElementById(`node-${node.id}`);
            if (nodeEl) {
                nodeEl.style.top = `${node.y}px`;
            }
        }
    }
};


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------



// Connection Management - Simplified with straight lines
class ConnectionManager {
    constructor() {
        this.connections = new Map();
        this.categories = null; // Will be set by main app
    }

    // Single method to ensure connection exists and is positioned correctly
    ensureConnection(parentId, childId, nodes) {
        const lineId = `connection-${parentId}-${childId}`;
        
        // Validate nodes exist and are visible
        const parentNode = nodes.find(n => n.id === parentId);
        const childNode = nodes.find(n => n.id === childId);
        const parentEl = document.getElementById(`node-${parentId}`);
        const childEl = document.getElementById(`node-${childId}`);
        
        if (!parentNode || !childNode || !parentEl || !childEl || 
            parentEl.style.display === 'none' || childEl.style.display === 'none') {
            this.removeConnection(lineId);
            return;
        }

        // Remove existing connection if it exists
        this.removeConnection(lineId);
        
        // Create new connection
        const line = this.createStraightConnection(lineId, parentNode, childNode, parentEl, childEl);
        if (line) {
            const container = document.getElementById('canvasContent') || document.getElementById('canvas');
            container.appendChild(line);
            
            this.connections.set(lineId, {
                parentId,
                childId,
                element: line,
                lastUpdate: Date.now()
            });
        }
    }

    // Remove specific connection
    removeConnection(lineId) {
        const connection = this.connections.get(lineId);
        if (connection && connection.element && connection.element.parentNode) {
            connection.element.remove();
        }
        this.connections.delete(lineId);
        
        // Also remove any DOM elements with this ID (cleanup)
        const existingEl = document.getElementById(lineId);
        if (existingEl) {
            existingEl.remove();
        }
    }

    // Remove all connections for a node
    removeNodeConnections(nodeId) {
        const connectionsToRemove = [];
        
        for (const [lineId, connection] of this.connections.entries()) {
            if (connection.parentId === nodeId || connection.childId === nodeId) {
                connectionsToRemove.push(lineId);
            }
        }
        
        connectionsToRemove.forEach(lineId => this.removeConnection(lineId));
    }

    // Update all connections for a node
    updateNodeConnections(nodeId, nodes) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        // Update lines where this node is a parent
        nodes.forEach(childNode => {
            if (childNode.parentId === nodeId) {
                this.ensureConnection(nodeId, childNode.id, nodes);
            }
        });

        // Update line where this node is a child
        if (node.parentId) {
            this.ensureConnection(node.parentId, nodeId, nodes);
        }
    }

    // Create simple straight connection line (div-based)
    createStraightConnection(lineId, parentNode, childNode, parentEl, childEl) {
        const coords = this.calculateConnectionPoints(parentNode, childNode, parentEl, childEl);
        const lineColor = this.categories?.[parentNode.category]?.color || '#64748b';
        
        const { x1, y1, x2, y2 } = coords;
        
        // Calculate line properties
        const deltaX = x2 - x1;
        const deltaY = y2 - y1;
        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        
        // Create line element
        const line = document.createElement('div');
        line.id = lineId;
        line.className = 'connection-line';
        
        line.style.cssText = `
            position: absolute;
            left: ${x1}px;
            top: ${y1}px;
            width: ${length}px;
            height: 3px;
            background: ${lineColor};
            transform-origin: left center;
            transform: rotate(${angle}deg);
            pointer-events: none;
            z-index: 5;
            color: ${lineColor};
        `;
        
        return line;
    }

    // Calculate connection points between nodes
    calculateConnectionPoints(parentNode, childNode, parentEl, childEl) {
        const parentX = parentNode.x;
        const parentY = parentNode.y;
        const childX = childNode.x;
        const childY = childNode.y;
        
        const parentWidth = parseInt(parentEl.style.width) || parentNode.width || 60;
        const parentHeight = parseInt(parentEl.style.height) || parentNode.height || 60;
        const childWidth = parseInt(childEl.style.width) || childNode.width || 60;
        const childHeight = parseInt(childEl.style.height) || childNode.height || 60;
        
        return {
            x1: parentX + parentWidth,
            y1: parentY + parentHeight / 2,
            x2: childX,
            y2: childY + childHeight / 2
        };
    }

    // Update all connections
    updateAllConnections(nodes) {
        // Remove invalid connections
        const validConnections = new Set();
        nodes.forEach(node => {
            if (node.parentId) {
                validConnections.add(`connection-${node.parentId}-${node.id}`);
            }
        });

        // Remove connections that are no longer valid
        for (const [lineId, connection] of this.connections.entries()) {
            if (!validConnections.has(lineId)) {
                this.removeConnection(lineId);
            }
        }

        // Create/update valid connections
        nodes.forEach(node => {
            if (node.parentId) {
                const parentNode = nodes.find(n => n.id === node.parentId);
                if (parentNode) {
                    this.ensureConnection(node.parentId, node.id, nodes);
                }
            }
        });
    }

    // Clear all connections
    clear() {
        for (const [lineId, connection] of this.connections.entries()) {
            if (connection.element && connection.element.parentNode) {
                connection.element.remove();
            }
        }
        this.connections.clear();
    }
}



// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------



// Main LLMCanvas Application
window.LLMCanvas = {
    // State variables
    nodes: [],
    selectedNode: null,
    nodeIdCounter: 1,
    totalMessages: 0,
    
    // Managers
    connectionManager: new ConnectionManager(),
    
    // Track which node is currently focused
    focusedNodeId: null,  

    // Selection state for forking
    selectedText: '',
    selectedNodeId: null,
    
    // Drag state
    isDragging: false,
    draggedNode: null,
    dragOffset: { x: 0, y: 0 },

    // Click vs Drag detection
    mouseDownPos: { x: 0, y: 0 },
    mouseDownTime: 0,
    DRAG_THRESHOLD: 5, // pixels
    CLICK_TIME_THRESHOLD: 200, // milliseconds

    // Resize state
    isResizing: false,
    resizingNode: null,
    resizeStartPos: { x: 0, y: 0 },
    resizeStartSize: { width: 0, height: 0 },

    // Canvas dimensions for dynamic sizing
    canvasSize: {
        width: window.innerWidth,
        height: window.innerHeight
    },

    // Minimap state
    minimapVisible: false,
    minimapScale: 0.1,

    // Panel collapse states
    toolbarCollapsed: false,
    statsPanelCollapsed: false,

    // Category definitions
    categories: {
        general: { name: 'General', color: '#64748b', bgColor: '#f8fafc' },
        research: { name: 'Research', color: '#3b82f6', bgColor: '#eff6ff' },
        creative: { name: 'Creative', color: '#10b981', bgColor: '#ecfdf5' },
        problem: { name: 'Problem Solving', color: '#f59e0b', bgColor: '#fffbeb' },
        planning: { name: 'Planning', color: '#8b5cf6', bgColor: '#f5f3ff' },
        learning: { name: 'Learning', color: '#ef4444', bgColor: '#fef2f2' }
    },

    // Current filter
    activeFilter: null,



// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


// Initialize the application
 init: function() {
        console.log('AI Research Canvas with DeepSeek API integration loaded');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
            return;
        }
        
        // Set up connection manager
        this.connectionManager.categories = this.categories;
        
        this.updateStats();
        this.setupEventListeners();
        this.updateCanvasSize();
        
        // Show minimap by default
        this.minimapVisible = true;
        const minimap = document.getElementById('minimap');
        if (minimap) {
            minimap.classList.add('visible');
            minimap.style.display = 'block';
            setTimeout(() => {
                this.updateMinimap();
                this.setupMinimapEvents();
            }, 300);
        }
        
        this.enableAutoSave();
        
        // Check if this is the first time loading the page
        const hasSeenWelcome = localStorage.getItem('llm-canvas-welcome-shown');
        
        if (!hasSeenWelcome) {
            // First time user - load example JSON (ignore auto-save)
            console.log('First time user detected - loading example JSON');
            setTimeout(() => {
                this.loadExampleJSON();
            }, 200);
        } else {
            // Returning user - check for auto-save
            console.log('Returning user - checking for auto-save');
            setTimeout(() => {
                const loaded = this.loadAutoSave();
                if (!loaded) {
                    const originNode = this.createNode(1100, 650);
                    originNode.title = 'Origin Prompt';
                }
                this.updateEmptyState();
            }, 200);
        }
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


// Load example JSON file from server
    loadExampleJSON: function() {
        fetch('/ai-canvas/ai-canvas-example-json-saved-file.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Example file not found');
                }
                return response.json();
            })
            .then(sessionData => {
                this.loadSessionData(sessionData);
                this.updateEmptyState();
                
                // Show welcome modal after a brief delay
                setTimeout(() => {
                    const modal = document.getElementById('welcomeModal');
                    if (modal) {
                        modal.style.display = 'block';
                    }
                }, 800);
            })
            .catch(error => {
                console.error('Error loading example JSON:', error);
                // If example fails to load, create default node
                const originNode = this.createNode(1100, 650);
                originNode.title = 'Origin Prompt';
                this.updateEmptyState();
            });
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Toggle toolbar visibility
    toggleToolbar: function() {
        this.toolbarCollapsed = !this.toolbarCollapsed;
        const toolbar = document.querySelector('.toolbar');
        const toggleBtn = document.getElementById('toolbarToggle');
        
        if (this.toolbarCollapsed) {
            toolbar.classList.add('collapsed');
            toggleBtn.innerHTML = '☰';
            toggleBtn.title = 'Show toolbar';
        } else {
            toolbar.classList.remove('collapsed');
            toggleBtn.innerHTML = '×';
            toggleBtn.title = 'Hide toolbar';
        }
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Toggle stats panel visibility
    toggleStatsPanel: function() {
        this.statsPanelCollapsed = !this.statsPanelCollapsed;
        const statsPanel = document.querySelector('.stats-panel');
        const toggleBtn = document.getElementById('statsPanelToggle');
        
        if (this.statsPanelCollapsed) {
            statsPanel.classList.add('collapsed');
            toggleBtn.innerHTML = '📊';
            toggleBtn.title = 'Show stats panel';
        } else {
            statsPanel.classList.remove('collapsed');
            toggleBtn.innerHTML = '×';
            toggleBtn.title = 'Hide stats panel';
        }
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Helper function to darken a color
    darkenColor: function(color, percent) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const darkerR = Math.floor(r * (100 - percent) / 100);
        const darkerG = Math.floor(g * (100 - percent) / 100);
        const darkerB = Math.floor(b * (100 - percent) / 100);
        
        return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Helper function to lighten a color
    lightenColor: function(color, percent) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const lighterR = Math.floor(r + (255 - r) * percent / 100);
        const lighterG = Math.floor(g + (255 - g) * percent / 100);
        const lighterB = Math.floor(b + (255 - b) * percent / 100);
        return `#${lighterR.toString(16).padStart(2, '0')}${lighterG.toString(16).padStart(2, '0')}${lighterB.toString(16).padStart(2, '0')}`;
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Update canvas size based on node positions
    updateCanvasSize: function() {
        if (this.nodes.length === 0) {
            this.canvasSize.width = Math.max(window.innerWidth, 2000);
            this.canvasSize.height = Math.max(window.innerHeight, 1500);
        } else {
            const padding = 300;
            let maxX = window.innerWidth, maxY = window.innerHeight;
            
            this.nodes.forEach(node => {
                maxX = Math.max(maxX, node.x + (node.width || 1100) + 100);
                maxY = Math.max(maxY, node.y + (node.height || 650) + 100);
            });
            
            this.canvasSize.width = maxX + padding;
            this.canvasSize.height = maxY + padding;
        }
        
        const canvasContent = document.getElementById('canvasContent');
        if (canvasContent) {
            canvasContent.style.width = `${this.canvasSize.width}px`;
            canvasContent.style.height = `${this.canvasSize.height}px`;
        }
        
        const gridBg = document.querySelector('.grid-bg');
        if (gridBg) {
            gridBg.style.width = `${this.canvasSize.width}px`;
            gridBg.style.height = `${this.canvasSize.height}px`;
        }
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Auto-scroll when dragging near edges
    handleEdgeScroll: function(clientX, clientY) {
        const canvas = document.getElementById('canvas');
        const scrollSpeed = 10;
        const edgeThreshold = 50;
        
        const rect = canvas.getBoundingClientRect();
        const relativeX = clientX - rect.left;
        const relativeY = clientY - rect.top;
        
        if (relativeX < edgeThreshold) {
            canvas.scrollLeft = Math.max(0, canvas.scrollLeft - scrollSpeed);
        } else if (relativeX > rect.width - edgeThreshold) {
            canvas.scrollLeft += scrollSpeed;
        }
        
        if (relativeY < edgeThreshold) {
            canvas.scrollTop = Math.max(0, canvas.scrollTop - scrollSpeed);
        } else if (relativeY > rect.height - edgeThreshold) {
            canvas.scrollTop += scrollSpeed;
        }
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


// Setup global event listeners
setupEventListeners: function() {
    // Mouse move for dragging and resizing
    document.addEventListener('mousemove', (e) => {
        // Check if we should start dragging
        if (this.draggedNode && !this.isDragging) {
            const deltaX = Math.abs(e.clientX - this.mouseDownPos.x);
            const deltaY = Math.abs(e.clientY - this.mouseDownPos.y);
            
            // If moved beyond threshold, start dragging
            if (deltaX > this.DRAG_THRESHOLD || deltaY > this.DRAG_THRESHOLD) {
                this.isDragging = true;
                
                const nodeEl = document.getElementById(`node-${this.draggedNode}`);
                if (nodeEl) {
                    nodeEl.classList.add('dragging');
                    nodeEl.style.zIndex = '1000';
                }
                
                console.log('🟢 DRAG STARTED - Node:', this.draggedNode, 'deltaX:', deltaX, 'deltaY:', deltaY);
            }
        }
        
        // Handle active dragging
        if (this.isDragging && this.draggedNode) {
            e.preventDefault();
            
            const canvas = document.getElementById('canvas');
            const rect = canvas.getBoundingClientRect();
            
            const node = this.nodes.find(n => n.id === this.draggedNode);
            const nodeEl = document.getElementById(`node-${this.draggedNode}`);
            
            if (node && nodeEl) {
                node.x = e.clientX - rect.left + canvas.scrollLeft - this.dragOffset.x;
                node.y = e.clientY - rect.top + canvas.scrollTop - this.dragOffset.y;
                
                node.x = Math.max(0, node.x);
                node.y = Math.max(NodeState.MINIMUM_Y, node.y);
                
                nodeEl.style.left = `${node.x}px`;
                nodeEl.style.top = `${node.y}px`;
                
                this.handleEdgeScroll(e.clientX, e.clientY);
                
                // Update connections while dragging
                this.connectionManager.updateNodeConnections(this.draggedNode, this.nodes);
                
                this.updateCanvasSize();
            }
            
        } else if (this.isResizing && this.resizingNode) {
            const node = this.nodes.find(n => n.id === this.resizingNode);
            const nodeEl = document.getElementById(`node-${this.resizingNode}`);
            
            if (node && nodeEl) {
                const deltaX = e.clientX - this.resizeStartPos.x;
                const deltaY = e.clientY - this.resizeStartPos.y;
                
                const newWidth = Math.max(300, this.resizeStartSize.width + deltaX);
                const newHeight = Math.max(400, this.resizeStartSize.height + deltaY);
                
                NodeState.updateNodeDimensions(node, nodeEl, false);
                node.width = newWidth;
                node.height = newHeight;
                nodeEl.style.width = `${newWidth}px`;
                nodeEl.style.height = `${newHeight}px`;
                
                // Update connections while resizing
                this.connectionManager.updateNodeConnections(this.resizingNode, this.nodes);
                
                this.updateCanvasSize();
            }
        }
    });

    // Mouse up for dragging and resizing
    document.addEventListener('mouseup', (e) => {
        console.log('🔴 MOUSEUP EVENT - draggedNode:', this.draggedNode, 'isDragging:', this.isDragging);
        
        // Handle drag end
        if (this.draggedNode) {
            const nodeId = this.draggedNode;
            const nodeEl = document.getElementById(`node-${nodeId}`);
            const node = this.nodes.find(n => n.id === nodeId);
            
            // Calculate time held and distance moved
            const timeHeld = Date.now() - this.mouseDownTime;
            const deltaX = Math.abs(e.clientX - this.mouseDownPos.x);
            const deltaY = Math.abs(e.clientY - this.mouseDownPos.y);
            
            console.log('📊 MOUSEUP METRICS:');
            console.log('  - Node ID:', nodeId);
            console.log('  - isDragging:', this.isDragging);
            console.log('  - timeHeld:', timeHeld, 'ms');
            console.log('  - deltaX:', deltaX, 'px');
            console.log('  - deltaY:', deltaY, 'px');
            console.log('  - DRAG_THRESHOLD:', this.DRAG_THRESHOLD);
            console.log('  - CLICK_TIME_THRESHOLD:', this.CLICK_TIME_THRESHOLD);
            
            // Clean up dragging state
            if (nodeEl) {
                nodeEl.classList.remove('dragging');
                nodeEl.style.zIndex = node && node.isBoxView ? '10' : '50';
            }
            
            // Store the dragging state BEFORE resetting
            const wasDragging = this.isDragging;
            console.log('💾 Stored wasDragging:', wasDragging);
            
            // Calculate if this qualifies as a quick click
            const isQuickClick = !wasDragging && 
                                 timeHeld < this.CLICK_TIME_THRESHOLD && 
                                 deltaX <= this.DRAG_THRESHOLD && 
                                 deltaY <= this.DRAG_THRESHOLD;
            
            console.log('🎯 DECISION LOGIC:');
            console.log('  - !wasDragging:', !wasDragging);
            console.log('  - timeHeld < threshold:', timeHeld < this.CLICK_TIME_THRESHOLD);
            console.log('  - deltaX <= threshold:', deltaX <= this.DRAG_THRESHOLD);
            console.log('  - deltaY <= threshold:', deltaY <= this.DRAG_THRESHOLD);
            console.log('  - isQuickClick:', isQuickClick);
            
            // Reset drag state AFTER checking
            this.isDragging = false;
            this.draggedNode = null;
            console.log('🔄 Reset: isDragging = false, draggedNode = null');
            
            if (isQuickClick) {
                // It was a quick click - open dialog
                console.log('✅ ACTION: Quick click detected - CALLING selectNode(' + nodeId + ')');
                this.selectNode(nodeId);
            } else if (wasDragging) {
                // It was a drag - DON'T open dialog, just update connections
                console.log('✅ ACTION: Drag detected - NOT calling selectNode, updating connections only');
                this.connectionManager.updateNodeConnections(nodeId, this.nodes);
                this.updateCanvasSize();
            } else {
                // It was a hold without dragging
                console.log('✅ ACTION: Hold detected (not quick enough) - NOT calling selectNode');
            }
            
            console.log('─────────────────────────────────────────');
        }
        
        // Handle resize end
        if (this.isResizing && this.resizingNode) {
            const nodeEl = document.getElementById(`node-${this.resizingNode}`);
            if (nodeEl) {
                nodeEl.classList.remove('resizing');
            }
            
            this.connectionManager.updateNodeConnections(this.resizingNode, this.nodes);
            this.updateCanvasSize();
            
            this.isResizing = false;
            this.resizingNode = null;
        }
    });

    // Handle text selection
    document.addEventListener('mouseup', () => {
        this.handleTextSelection();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.shiftKey && e.key === 'F') {
            e.preventDefault();
            this.handleForkShortcut();
        }
        
        if (e.key === 'Escape') {
            e.preventDefault();
            this.deselectAllNodes();
        }
    });

    // Canvas background click handler
    const canvasContent = document.getElementById('canvasContent');
    if (canvasContent) {
        canvasContent.addEventListener('click', (e) => {
            if (e.target === canvasContent || e.target.classList.contains('grid-bg')) {
                e.stopPropagation();
                this.deselectAllNodes();
            }
        });
    }

    const canvas = document.getElementById('canvas');
    if (canvas) {
        canvas.addEventListener('click', (e) => {
            if (e.target === canvas) {
                e.stopPropagation();
                this.deselectAllNodes();
            }
        });
        
        canvas.addEventListener('scroll', () => {
            this.updateMinimapViewport();
        });
    }

    window.addEventListener('resize', () => {
        this.updateCanvasSize();
        this.updateMinimap();
    });
},


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


// Build node HTML
buildNodeHTML: function(node, category) {
    return `<div class="drag-handle" style="background: ${category.color}; cursor: move; position: relative;">
                <button class="minimize-btn minimize-left" onclick="event.stopPropagation(); LLMCanvas.minimizeNode(${node.id})" title="Minimize">−</button>
                <button class="minimize-btn minimize-right" onclick="event.stopPropagation(); LLMCanvas.minimizeNode(${node.id})" title="Minimize">−</button>
            </div>
        <div class="node-content">
            <div class="node-header category-${node.category}" id="header-${node.id}">
                <div class="category-badge" style="background: ${category.color}; color: white;">${category.name}</div>
                <input class="node-title" value="${node.title}" placeholder="Chat title..." onchange="LLMCanvas.updateNodeTitle(${node.id}, this.value)" onclick="event.stopPropagation()">
                <div class="node-actions">
                    <select class="category-selector" onchange="LLMCanvas.changeNodeCategory(${node.id}, this.value)" onclick="event.stopPropagation()">
                        ${Object.keys(this.categories).map(key => 
                            `<option value="${key}"${node.category === key ? ' selected' : ''}>${this.categories[key].name}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
            <div class="messages" id="messages-${node.id}"></div>
            <div class="input-area">
                <input class="input-field" placeholder="Type message..." id="input-${node.id}" onkeypress="LLMCanvas.handleKeyPress(event, ${node.id})">
                <button class="send-btn" onclick="LLMCanvas.sendMessage(${node.id})" id="send-${node.id}">→</button>
            </div>
        </div>
        <div class="resize-handle" onmousedown="LLMCanvas.handleResizeStart(event, ${node.id})"></div>`;
},


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


// Handle text selection for forking
handleTextSelection: function() {
    const selection = window.getSelection();
    if (selection.toString().trim()) {
        this.selectedText = selection.toString().trim();
        
        let selectedNode = null;
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const messageEl = container.nodeType === Node.TEXT_NODE ? 
            container.parentElement : container;
        
        const messagesContainer = messageEl.closest('[id^="messages-"]');
        if (messagesContainer) {
            const nodeId = parseInt(messagesContainer.id.replace('messages-', ''));
            this.selectedNodeId = nodeId;
        }
    } else {
        this.selectedText = '';
        this.selectedNodeId = null;
    }
},

// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------

// Handle fork shortcut
handleForkShortcut: function() {
    if (!this.selectedText || !this.selectedNodeId) {
        alert('Please select some text first, then press Shift+F to fork');
        return;
    }
    
    const parentNode = this.nodes.find(n => n.id === this.selectedNodeId);
    if (!parentNode) return;
    
    const newX = parentNode.x + 350;
    const newY = Math.max(NodeState.MINIMUM_Y, parentNode.y + 50);
    
    // Create new node with parent's category
    const titleText = this.selectedText.length > 130 
        ? this.selectedText.substring(0, 130) + '...' 
        : this.selectedText;
    
    const newNode = this.createNode(newX, newY, titleText, parentNode.category);
    
    newNode.parentId = parentNode.id;
    newNode.pendingInput = this.selectedText;
    
    setTimeout(() => {
        this.connectionManager.ensureConnection(parentNode.id, newNode.id, this.nodes);
    }, 100);
    
    window.getSelection().removeAllRanges();
    this.selectedText = '';
    this.selectedNodeId = null;
    
    setTimeout(() => {
        const inputEl = document.getElementById(`input-${newNode.id}`);
        if (inputEl && newNode.pendingInput) {
            inputEl.value = newNode.pendingInput;
            inputEl.focus();
            delete newNode.pendingInput;
        }
    }, 300);
},



// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


deselectAllNodes: function() {
        // This function now does nothing since we want nodes to stay open
        // Just reset z-indexes
        document.querySelectorAll('.chat-node').forEach(el => {
            const nodeId = parseInt(el.id.replace('node-', ''));
            const node = this.nodes.find(n => n.id === nodeId);
            if (node && !node.isBoxView) {
                el.style.zIndex = '50';
            } else {
                el.style.zIndex = '10';
            }
        });
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


// Select node with unified state management
selectNode: function(nodeId) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    console.log('selectNode called for:', nodeId, 'isBoxView:', node.isBoxView);
    
    // If this node is already in box view, expand it
    if (node.isBoxView) {
        this.expandNodeFromBox(nodeId);
    }
    
    // Update z-index to bring this node to front
    document.querySelectorAll('.chat-node').forEach(el => {
        if (el.id === `node-${nodeId}`) {
            el.style.zIndex = '100';
        } else {
            // Keep other expanded nodes visible but behind the selected one
            const otherId = parseInt(el.id.replace('node-', ''));
            const otherNode = this.nodes.find(n => n.id === otherId);
            if (otherNode && !otherNode.isBoxView) {
                el.style.zIndex = '50';
            } else {
                el.style.zIndex = '10';
            }
        }
    });
    
    this.focusedNodeId = nodeId;
    
    setTimeout(() => {
        this.connectionManager.updateNodeConnections(nodeId, this.nodes);
        this.updateCanvasSize();
        this.updateMinimap();
    }, 100);
},

// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------

// Create a new chat node
createNode: function(x = null, y = null, initialTitle = null, initialCategory = 'general') {
    if (x === null || y === null) {
        const pos = this.findGoodPosition();
        x = pos.x;
        y = pos.y;
    }

    const node = {
        id: this.nodeIdCounter++,
        x,
        y,
        width: NodeState.EXPANDED.width,
        height: NodeState.EXPANDED.height,
        title: initialTitle || (this.nodeIdCounter === 2 ? 'Origin Prompt' : `Chat ${this.nodeIdCounter - 1}`),
        messages: [],
        isThinking: false,
        currentInput: '',
        category: initialCategory,
        isBoxView: false
    };

    this.nodes.push(node);
    this.renderNode(node);
    
    setTimeout(() => {
        this.selectNode(node.id);
    }, 100);
    
    this.updateStats();
    this.updateEmptyState();
    this.updateCanvasSize();
    this.updateMinimap();
    
    return node;
},


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------

// Find good position for new node
findGoodPosition: function() {
    const nodeWidth = 700;
    const nodeHeight = 650;
    const margin = 20;
    const startX = 150;
    const startY = NodeState.MINIMUM_Y;

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 8; col++) {
            const testX = startX + col * (nodeWidth + margin);
            const testY = startY + row * (nodeHeight + margin);
            
            const hasOverlap = this.nodes.some(node => {
                const dx = Math.abs(node.x - testX);
                const dy = Math.abs(node.y - testY);
                const checkWidth = node.id === this.selectedNode ? NodeState.EXPANDED.width : NodeState.BOX.width;
                const checkHeight = node.id === this.selectedNode ? NodeState.EXPANDED.height : NodeState.BOX.height;
                return dx < checkWidth + 30 && dy < checkHeight + 30;
            });
            
            if (!hasOverlap) {
                return { x: testX, y: testY };
            }
        }
    }

    return {
        x: Math.random() * 400 + 150,
        y: Math.random() * 300 + NodeState.MINIMUM_Y
    };
},

// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------

// Render a node
renderNode: function(node) {
    try {
        if (!node.category) {
            node.category = 'general';
        }
        
        // Ensure correct dimensions
        NodeState.validatePosition(node);
        if (!node.isBoxView) {
            NodeState.updateNodeDimensions(node, null, false);
        }
        
        const category = this.categories[node.category] || this.categories.general;
        
        const nodeEl = document.createElement('div');
        nodeEl.className = 'chat-node';
        nodeEl.id = `node-${node.id}`;
        nodeEl.style.left = `${node.x}px`;
        nodeEl.style.top = `${node.y}px`;
        nodeEl.style.width = `${node.width}px`;
        nodeEl.style.height = `${node.height}px`;
        nodeEl.style.borderColor = category.color;
        nodeEl.style.zIndex = '10';

        nodeEl.innerHTML = this.buildNodeHTML(node, category);

        // Handle mousedown for click vs drag detection
        nodeEl.addEventListener('mousedown', (e) => {
            // Don't handle if clicking on interactive elements
            if (e.target.closest('.input-field, .send-btn, .node-btn, .category-selector, .node-title, .resize-handle, .messages')) {
                console.log('🚫 MOUSEDOWN ignored - clicked on interactive element');
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            const canvas = document.getElementById('canvas');
            const rect = canvas.getBoundingClientRect();
            
            // Record starting position and time for click detection
            this.mouseDownPos = { x: e.clientX, y: e.clientY };
            this.mouseDownTime = Date.now();
            this.draggedNode = node.id;
            
            this.dragOffset = {
                x: e.clientX - rect.left + canvas.scrollLeft - node.x,
                y: e.clientY - rect.top + canvas.scrollTop - node.y
            };
            
            console.log('🟡 MOUSEDOWN on node:', node.id);
            console.log('  - Position:', this.mouseDownPos);
            console.log('  - Time:', this.mouseDownTime);
            console.log('  - Node isBoxView:', node.isBoxView);
        });
        
        const container = document.getElementById('canvasContent') || document.getElementById('canvas');
        if (container) {
            container.appendChild(nodeEl);
        }
        
    } catch (error) {
        console.error('ERROR in renderNode:', error);
    }
},

// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


// Convert node to box view using unified state management
convertNodeToBox: function(nodeId) {
    const node = this.nodes.find(n => n.id === nodeId);
    const nodeEl = document.getElementById(`node-${nodeId}`);
    
    if (!node || !nodeEl) {
        console.log('convertNodeToBox - Node or element not found:', nodeId);
        return;
    }
    
    console.log('Converting node to box:', nodeId);
    
    // Store expanded dimensions if not already stored
    if (!node.expandedWidth) {
        node.expandedWidth = node.width || NodeState.EXPANDED.width;
        node.expandedHeight = node.height || NodeState.EXPANDED.height;
    }
    
    // Update state using unified system
    NodeState.updateNodeDimensions(node, nodeEl, true);
    
    const category = this.categories[node.category] || this.categories.general;
    
    // Apply box styling with !important to override everything
    nodeEl.className = 'chat-node box-view';
    nodeEl.style.cssText = `
        position: absolute !important;
        left: ${node.x}px !important;
        top: ${node.y}px !important;
        width: 60px !important;
        height: 60px !important;
        min-width: 60px !important;
        min-height: 60px !important;
        max-width: 60px !important;
        max-height: 60px !important;
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        overflow: visible !important;
        z-index: 10 !important;
        resize: none !important;
    `;
    
    // Create box HTML WITHOUT inline onclick
    const boxHTML = `
        <div class="node-box-view" id="box-view-${nodeId}" style="
            width: 60px; 
            height: 60px; 
            background: ${category.color}; 
            border-radius: 12px; 
            position: relative; 
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transition: all 0.3s ease; 
            margin: 0; 
            padding: 0;
        ">
            <div class="box-title" style="
                position: absolute; 
                bottom: 100%; 
                right: 0; 
                margin-bottom: 8px;
                background: rgba(255, 255, 255, 0.95); 
                backdrop-filter: blur(10px);
                padding: 4px 8px; 
                border-radius: 6px; 
                font-size: 11px;
                font-weight: 500; 
                color: #374151; 
                white-space: nowrap;
                max-width: 200px; 
                overflow: hidden; 
                text-overflow: ellipsis;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                border: 1px solid ${category.color}; 
                z-index: 200;
                pointer-events: none;
            ">${node.title}</div>
            <div class="box-icon" style="
                width: 100%; 
                height: 100%; 
                display: flex;
                align-items: center; 
                justify-content: center;
                font-size: 24px; 
                color: white; 
                font-weight: bold;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            ">💬</div>
        </div>
    `;
    
    nodeEl.innerHTML = boxHTML;
    
    // Add click handler that respects drag state
    const boxView = nodeEl.querySelector('.node-box-view');
    if (boxView) {
        let boxMouseDownTime = 0;
        let boxMouseDownPos = { x: 0, y: 0 };
        
        boxView.addEventListener('mousedown', (e) => {
            boxMouseDownTime = Date.now();
            boxMouseDownPos = { x: e.clientX, y: e.clientY };
            console.log('📦 BOX MOUSEDOWN - Node:', nodeId);
        });
        
        boxView.addEventListener('click', (e) => {
            const clickTime = Date.now() - boxMouseDownTime;
            const deltaX = Math.abs(e.clientX - boxMouseDownPos.x);
            const deltaY = Math.abs(e.clientY - boxMouseDownPos.y);
            
            console.log('📦 BOX CLICK - Node:', nodeId, 'clickTime:', clickTime, 'deltaX:', deltaX, 'deltaY:', deltaY);
            
            // Only expand if it was a real click (not a drag)
            if (clickTime < 300 && deltaX < 10 && deltaY < 10) {
                console.log('📦 BOX CLICK - Expanding node:', nodeId);
                e.stopPropagation();
                this.selectNode(nodeId);
            } else {
                console.log('📦 BOX CLICK - Ignoring (was a drag)');
            }
        });
    }
    
    // Force a reflow to ensure styles are applied
    nodeEl.offsetHeight;
    
    console.log('Node converted to box successfully:', nodeId);
},

// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------

// Reset view to default zoom/position
resetView: function() {
    const canvas = document.getElementById('canvas');
    if (canvas) {
        canvas.scrollTo({
            left: 0,
            top: 0,
            behavior: 'smooth'
        });
    }
},

// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------

// Center all nodes in view
centerAllNodes: function() {
    if (this.nodes.length === 0) return;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    this.nodes.forEach(node => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
    });
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    const canvas = document.getElementById('canvas');
    const rect = canvas.getBoundingClientRect();
    
    canvas.scrollTo({
        left: centerX - rect.width / 2,
        top: centerY - rect.height / 2,
        behavior: 'smooth'
    });
},


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Expand node from box using unified state management
    expandNodeFromBox: function(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        const nodeEl = document.getElementById(`node-${nodeId}`);
        
        if (!node || !nodeEl) return;
        
        // Restore dimensions using unified system
        node.width = node.expandedWidth || NodeState.EXPANDED.width;
        node.height = node.expandedHeight || NodeState.EXPANDED.height;
        NodeState.updateNodeDimensions(node, nodeEl, false);
        
        // Remove and re-render completely
        const parentContainer = nodeEl.parentNode;
        nodeEl.remove();
        this.renderNode(node);
        
        // Restore messages
        if (node.messages && node.messages.length > 0) {
            setTimeout(() => {
                const messagesEl = document.getElementById(`messages-${nodeId}`);
                if (messagesEl) {
                    messagesEl.innerHTML = '';
                    
                    node.messages.forEach(msg => {
                        const messageEl = document.createElement('div');
                        messageEl.className = `message ${msg.role}`;
                        const formattedContent = this.formatMessageContent(msg.content);
                        messageEl.innerHTML = formattedContent;
                        messagesEl.appendChild(messageEl);
                    });
                    
                    messagesEl.scrollTop = messagesEl.scrollHeight;
                }
            }, 50);
        }
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Center a node in the viewport
    centerNodeInViewport: function(node) {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;
        
        const canvasRect = canvas.getBoundingClientRect();
        const nodeCenterX = node.x + (node.width / 2);
        const nodeCenterY = node.y + (node.height / 2);
        
        const targetScrollX = nodeCenterX - (canvasRect.width / 2);
        const targetScrollY = nodeCenterY - (canvasRect.height / 2);
        
        const maxScrollX = Math.max(0, this.canvasSize.width - canvasRect.width);
        const maxScrollY = Math.max(0, this.canvasSize.height - canvasRect.height);
        
        const finalScrollX = Math.max(0, Math.min(targetScrollX, maxScrollX));
        const finalScrollY = Math.max(0, Math.min(targetScrollY, maxScrollY));
        
        canvas.scrollTo({
            left: finalScrollX,
            top: finalScrollY,
            behavior: 'smooth'
        });
        
        setTimeout(() => {
            this.updateMinimapViewport();
        }, 500);
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Handle resize start
    handleResizeStart: function(e, nodeId) {
        e.preventDefault();
        e.stopPropagation();
        
        this.isResizing = true;
        this.resizingNode = nodeId;
        
        const node = this.nodes.find(n => n.id === nodeId);
        const nodeEl = document.getElementById(`node-${nodeId}`);
        
        this.resizeStartPos = { x: e.clientX, y: e.clientY };
        this.resizeStartSize = { width: node.width, height: node.height };
        
        nodeEl.classList.add('resizing');
        this.selectNode(nodeId);
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Toggle minimap visibility
    toggleMinimap: function() {
        this.minimapVisible = !this.minimapVisible;
        const minimap = document.getElementById('minimap');
        
        if (!minimap) return;
        
        if (this.minimapVisible) {
            minimap.classList.add('visible');
            minimap.style.display = 'block';
            setTimeout(() => {
                this.updateMinimap();
                this.setupMinimapEvents();
            }, 50);
        } else {
            minimap.classList.remove('visible');
            minimap.style.display = 'none';
        }
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Update minimap with current canvas state
    updateMinimap: function() {
        if (!this.minimapVisible) return;

        const minimapContent = document.getElementById('minimapContent');
        if (!minimapContent) return;

        minimapContent.innerHTML = '<div class="minimap-viewport" id="minimapViewport"></div>';

        const minimapWidth = 276;
        const minimapHeight = 156;
        
        const canvasWidth = this.canvasSize.width;
        const canvasHeight = this.canvasSize.height;
        
        const scaleX = minimapWidth / canvasWidth;
        const scaleY = minimapHeight / canvasHeight;
        this.minimapScale = Math.min(scaleX, scaleY, 0.15);

        this.nodes.forEach(node => {
            if (this.activeFilter && node.category !== this.activeFilter) return;

            const minimapNode = document.createElement('div');
            minimapNode.className = 'minimap-node';
            minimapNode.id = `minimap-node-${node.id}`;
            
            const x = node.x * this.minimapScale;
            const y = node.y * this.minimapScale;
            const width = Math.max(4, node.width * this.minimapScale);
            const height = Math.max(4, node.height * this.minimapScale);
            
            minimapNode.style.left = `${x}px`;
            minimapNode.style.top = `${y}px`;
            minimapNode.style.width = `${width}px`;
            minimapNode.style.height = `${height}px`;
            
            const category = this.categories[node.category] || this.categories.general;
            minimapNode.style.borderColor = category.color;
            minimapNode.style.backgroundColor = category.bgColor;
            
            minimapNode.addEventListener('click', (e) => {
                e.stopPropagation();
                this.navigateToNode(node.id);
            });
            
            minimapContent.appendChild(minimapNode);
        });

        this.nodes.forEach(node => {
            if (node.parentId && (!this.activeFilter || node.category === this.activeFilter)) {
                const parentNode = this.nodes.find(n => n.id === node.parentId);
                if (parentNode && (!this.activeFilter || parentNode.category === this.activeFilter)) {
                    this.drawMinimapConnection(parentNode, node);
                }
            }
        });

        this.updateMinimapViewport();
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Draw connection line in minimap
    drawMinimapConnection: function(parentNode, childNode) {
        const minimapContent = document.getElementById('minimapContent');
        if (!minimapContent) return;

        const x1 = (parentNode.x + parentNode.width) * this.minimapScale;
        const y1 = (parentNode.y + parentNode.height/2) * this.minimapScale;
        const x2 = childNode.x * this.minimapScale;
        const y2 = (childNode.y + childNode.height/2) * this.minimapScale;

        const deltaX = x2 - x1;
        const deltaY = y2 - y1;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

        const line = document.createElement('div');
        line.className = 'minimap-connection';
        line.style.left = `${x1}px`;
        line.style.top = `${y1}px`;
        line.style.width = `${distance}px`;
        line.style.transform = `rotate(${angle}deg)`;
        
        const category = this.categories[parentNode.category] || this.categories.general;
        line.style.backgroundColor = category.color;

        minimapContent.appendChild(line);
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Update minimap viewport indicator
    updateMinimapViewport: function() {
        if (!this.minimapVisible) return;

        const viewport = document.getElementById('minimapViewport');
        const canvas = document.getElementById('canvas');
        if (!viewport || !canvas) return;

        const canvasRect = canvas.getBoundingClientRect();
        const scrollLeft = canvas.scrollLeft;
        const scrollTop = canvas.scrollTop;

        const x = scrollLeft * this.minimapScale;
        const y = scrollTop * this.minimapScale;
        const width = canvasRect.width * this.minimapScale;
        const height = canvasRect.height * this.minimapScale;

        viewport.style.left = `${x}px`;
        viewport.style.top = `${y}px`;
        viewport.style.width = `${width}px`;
        viewport.style.height = `${height}px`;
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Setup minimap event handlers
    setupMinimapEvents: function() {
        const minimapContent = document.getElementById('minimapContent');
        if (!minimapContent) return;

        minimapContent.addEventListener('click', (e) => {
            if (e.target.classList.contains('minimap-node')) return;

            const rect = minimapContent.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const canvasX = x / this.minimapScale;
            const canvasY = y / this.minimapScale;

            this.navigateToPosition(canvasX, canvasY);
        });
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Navigate to specific node
    navigateToNode: function(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;

        this.selectNode(nodeId);

        const canvas = document.getElementById('canvas');
        const rect = canvas.getBoundingClientRect();

        canvas.scrollTo(
            node.x - rect.width / 2 + node.width / 2,
            node.y - rect.height / 2 + node.height / 2
        );
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Navigate to specific position
    navigateToPosition: function(x, y) {
        const canvas = document.getElementById('canvas');
        const rect = canvas.getBoundingClientRect();

        canvas.scrollTo(
            x - rect.width / 2,
            y - rect.height / 2
        );
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Send message using DeepSeek API
    sendMessage: function(nodeId) {
        const inputEl = document.getElementById(`input-${nodeId}`);
        const message = inputEl.value.trim();
        
        if (!message) return;
        
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node || node.isThinking) return;

        // AUTO-CATEGORIZATION DISABLED - Category only changes via manual dropdown selection
        // if (node.messages.length === 0 && node.category === 'general') {
        //     const suggestedCategory = this.suggestCategory(message);
        //     if (suggestedCategory !== 'general') {
        //         node.category = suggestedCategory;
        //         document.getElementById(`node-${nodeId}`).remove();
        //         this.renderNode(node);
        //     }
        // }
        
        inputEl.value = '';
        this.addMessage(nodeId, 'user', message);
        this.setThinking(nodeId, true);
        this.callDeepSeekAPI(nodeId, message);
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Call DeepSeek API
    callDeepSeekAPI: async function(nodeId, message) {
        try {
            const payload = {
                model: "deepseek-chat",
                messages: [{ role: "user", content: message }],
                max_tokens: 1000,
                temperature: 0.7,
                stream: false,
                top_p: 0.9
            };

            const response = await fetch('/api-proxy.cfc?method=callDeepSeekAPI&returnformat=json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestData: JSON.stringify(payload) })
            });

            if (!response.ok) {
                throw new Error(`CFC Error: ${response.status}`);
            }

            const data = await response.json();
            let aiResponse = '';
            
            if (data.success) {
                if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
                    aiResponse = data.choices[0].message.content.trim();
                } else if (data.generated_text && data.generated_text.trim().length > 0) {
                    aiResponse = data.generated_text.trim();
                } else {
                    aiResponse = "[EMPTY RESPONSE] The DeepSeek API returned an empty response. Try rephrasing your message.";
                }
            } else if (data.error) {
                if (data.status && data.status.includes('404')) {
                    aiResponse = `[MODEL UNAVAILABLE] The DeepSeek model seems to be temporarily unavailable (404 error). This is a DeepSeek infrastructure issue.`;
                } else {
                    aiResponse = `[API ERROR] ${data.error} (Status: ${data.status || 'unknown'})`;
                }
            } else {
                aiResponse = "[CONNECTION ISSUE] Unable to get a response from the DeepSeek AI service right now.";
            }
            
            if (aiResponse.length === 0) {
                aiResponse = "[EMPTY RESPONSE] The DeepSeek AI model returned an empty response. Try rephrasing your message.";
            }
            
            this.addMessage(nodeId, 'assistant', aiResponse);
            this.setThinking(nodeId, false);
            
        } catch (error) {
            console.error('Error calling DeepSeek API:', error);
    
            let errorMessage = '[NETWORK ERROR] Could not connect to DeepSeek AI service.';
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = '[CONNECTION ERROR] Network request failed. Check your internet connection.';
            } else if (error.name === 'SyntaxError') {
                errorMessage = '[RESPONSE ERROR] Invalid response from server. Please try again.';
            } else if (error.message.includes('timeout')) {
                errorMessage = '[TIMEOUT ERROR] Request timed out. The server may be busy.';
            }
            
            this.addMessage(nodeId, 'assistant', `${errorMessage} Try again in a moment.`);
            this.setThinking(nodeId, false);
        }
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Add message to node
    addMessage: function(nodeId, role, content) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        node.messages.push({ role, content, timestamp: Date.now() });
        this.totalMessages++;
        
        const messagesEl = document.getElementById(`messages-${nodeId}`);
        const messageEl = document.createElement('div');
        messageEl.className = `message ${role}`;
        
        const formattedContent = this.formatMessageContent(content);
        messageEl.innerHTML = formattedContent;
        
        messagesEl.appendChild(messageEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        
        this.updateStats();
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Format message content for better display
    formatMessageContent: function(content) {
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        
        let formatted = escapeHtml(content);
        
        // Handle code blocks first
        formatted = formatted.replace(/```(\w+)?\n?([\s\S]*?)```/g, function(match, lang, code) {
            const language = lang ? ` data-language="${lang}"` : '';
            return `<pre${language}><code>${code.trim()}</code></pre>`;
        });
        formatted = formatted.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
        
        // Handle headers
        formatted = formatted.replace(/^### (.+)$/gm, '<h3 class="ai-header h3">$1</h3>');
        formatted = formatted.replace(/^## (.+)$/gm, '<h2 class="ai-header h2">$1</h2>');
        formatted = formatted.replace(/^# (.+)$/gm, '<h1 class="ai-header h1">$1</h1>');
        
        // Handle blockquotes
        formatted = formatted.replace(/^> (.+)$/gm, '<blockquote class="ai-quote">$1</blockquote>');
        
        // Convert numbered lists
        formatted = formatted.replace(/^(\s*)(\d+)\.\s+(.+)$/gm, function(match, indent, num, text) {
            const level = indent.length / 2;
            return `<div class="list-item numbered level-${level}"><span class="list-number">${num}.</span> ${text}</div>`;
        });
        
        // Convert bullet points
        formatted = formatted.replace(/^(\s*)[-*+]\s+(.+)$/gm, function(match, indent, text) {
            const level = indent.length / 2;
            const bullet = level > 0 ? '◦' : '•';
            return `<div class="list-item bullet level-${level}"><span class="list-bullet">${bullet}</span> ${text}</div>`;
        });
        
        // Handle **bold** and *italic*
        formatted = formatted.replace(/\*\*([^*\n]+)\*\*/g, '<strong class="ai-bold">$1</strong>');
        formatted = formatted.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em class="ai-italic">$1</em>');
        
        // Handle horizontal rules
        formatted = formatted.replace(/^---+$/gm, '<hr class="ai-divider">');
        
        // Handle tables
        formatted = this.formatTables(formatted);
        
        // Convert line breaks
        formatted = formatted.replace(/\n/g, '<br>');
        
        // Group consecutive list items
        formatted = this.groupListItems(formatted);
        
        // Clean up excessive line breaks
        formatted = formatted.replace(/(<br>\s*){3,}/g, '<br><br>');
        
        return formatted;
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Helper function for table formatting
    formatTables: function(content) {
        const lines = content.split('\n');
        let inTable = false;
        let tableHTML = '';
        let result = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.includes('|') && line.split('|').length > 2) {
                if (!inTable) {
                    inTable = true;
                    tableHTML = '<table class="ai-table">';
                    
                    const nextLine = lines[i + 1]?.trim();
                    const isHeader = nextLine && nextLine.includes('---');
                    
                    if (isHeader) {
                        tableHTML += '<thead><tr>';
                        const headers = line.split('|').map(h => h.trim()).filter(h => h);
                        headers.forEach(header => {
                            tableHTML += `<th>${header}</th>`;
                        });
                        tableHTML += '</tr></thead><tbody>';
                        i++;
                    } else {
                        tableHTML += '<tbody><tr>';
                        const cells = line.split('|').map(c => c.trim()).filter(c => c);
                        cells.forEach(cell => {
                            tableHTML += `<td>${cell}</td>`;
                        });
                        tableHTML += '</tr>';
                    }
                } else {
                    const cells = line.split('|').map(c => c.trim()).filter(c => c);
                    tableHTML += '<tr>';
                    cells.forEach(cell => {
                        tableHTML += `<td>${cell}</td>`;
                    });
                    tableHTML += '</tr>';
                }
            } else if (inTable) {
                tableHTML += '</tbody></table>';
                result += tableHTML + '\n' + line + '\n';
                tableHTML = '';
                inTable = false;
            } else {
                result += line + '\n';
            }
        }
        
        if (inTable) {
            tableHTML += '</tbody></table>';
            result += tableHTML;
        }
        
        return result;
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Enhanced list grouping with nesting support
    groupListItems: function(content) {
        content = content.replace(/((<div class="list-item[^"]*">.*?<\/div>)+)/g, function(match) {
            return `<div class="formatted-list">${match}</div>`;
        });
        
        return content;
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Set thinking state
    setThinking: function(nodeId, thinking) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        node.isThinking = thinking;
        
        const messagesEl = document.getElementById(`messages-${nodeId}`);
        const inputEl = document.getElementById(`input-${nodeId}`);
        const sendBtn = document.getElementById(`send-${nodeId}`);
        
        if (thinking) {
            const thinkingEl = document.createElement('div');
            thinkingEl.className = 'message thinking';
            thinkingEl.id = `thinking-${nodeId}`;
            thinkingEl.textContent = 'DeepSeek AI is thinking...';
            messagesEl.appendChild(thinkingEl);
            messagesEl.scrollTop = messagesEl.scrollHeight;
            
            inputEl.disabled = true;
            sendBtn.disabled = true;
        } else {
            const thinkingEl = document.getElementById(`thinking-${nodeId}`);
            if (thinkingEl) thinkingEl.remove();
            
            inputEl.disabled = false;
            sendBtn.disabled = false;
            inputEl.focus();
        }
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Event handlers
    handleKeyPress: function(event, nodeId) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage(nodeId);
        }
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    updateNodeTitle: function(nodeId, title) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) node.title = title;
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Change node category
    changeNodeCategory: function(nodeId, newCategory) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
            const inputEl = document.getElementById(`input-${nodeId}`);
            const currentInputValue = inputEl ? inputEl.value : '';
            const savedMessages = [...node.messages];
            
            node.category = newCategory;
            
            const nodeEl = document.getElementById(`node-${nodeId}`);
            const category = this.categories[newCategory] || this.categories.general;
            
            nodeEl.style.borderColor = category.color;
            
            const dragHandle = nodeEl.querySelector('.drag-handle');
            if (dragHandle) {
                dragHandle.style.background = category.color;
            }
            
            const categoryBadge = nodeEl.querySelector('.category-badge');
            if (categoryBadge) {
                categoryBadge.style.background = category.color;
                categoryBadge.textContent = category.name;
            }
            
            const header = nodeEl.querySelector('.node-header');
            if (header) {
                header.className = header.className.replace(/category-\w+/g, '');
                header.classList.add(`category-${newCategory}`);
            }
            
            const categorySelector = nodeEl.querySelector('.category-selector');
            if (categorySelector) {
                categorySelector.value = newCategory;
            }
            
            if (inputEl && currentInputValue) {
                inputEl.value = currentInputValue;
            }
            
            this.connectionManager.updateAllConnections(this.nodes);
            this.updateStats();
        }
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Smart categorization based on message content
    suggestCategory: function(message) {
        const text = message.toLowerCase();
        
        if (text.includes('explain') || text.includes('how to') || text.includes('teach') || text.includes('learn')) {
            return 'learning';
        } else if (text.includes('brainstorm') || text.includes('creative') || text.includes('write') || text.includes('story')) {
            return 'creative';
        } else if (text.includes('error') || text.includes('fix') || text.includes('debug') || text.includes('problem')) {
            return 'problem';
        } else if (text.includes('research') || text.includes('analyze') || text.includes('find') || text.includes('study')) {
            return 'research';
        } else if (text.includes('plan') || text.includes('strategy') || text.includes('organize') || text.includes('schedule')) {
            return 'planning';
        } else {
            return 'general';
        }
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


// Minimize node to box view (does NOT delete the node)
minimizeNode: function(nodeId) {
    const node = this.nodes.find(n => n.id === nodeId);
    const nodeEl = document.getElementById(`node-${nodeId}`);
    
    if (!node || !nodeEl) {
        console.log('Node or element not found:', nodeId);
        return;
    }
    
    // If already in box view, do nothing
    if (node.isBoxView) {
        console.log('Node already in box view:', nodeId);
        return;
    }
    
    console.log('Minimizing node:', nodeId);
    
    // Store expanded dimensions before converting
    node.expandedWidth = node.width;
    node.expandedHeight = node.height;
    
    // Convert to box view (minimize/hide the chat dialog)
    this.convertNodeToBox(nodeId);
    
    // Clear focused state if this was the focused node
    if (this.focusedNodeId === nodeId) {
        this.focusedNodeId = null;
    }
    
    // Update z-indexes for remaining expanded nodes
    document.querySelectorAll('.chat-node').forEach(el => {
        const elId = parseInt(el.id.replace('node-', ''));
        const elNode = this.nodes.find(n => n.id === elId);
        if (elNode && !elNode.isBoxView) {
            el.style.zIndex = '50';
        } else {
            el.style.zIndex = '10';
        }
    });
    
    // Update connections and UI
    setTimeout(() => {
        this.connectionManager.updateAllConnections(this.nodes);
        this.updateCanvasSize();
        this.updateMinimap();
    }, 200);
},


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Filter nodes by category
    filterByCategory: function(category) {
        if (category === 'all') {
            this.activeFilter = null;
        } else {
            this.activeFilter = this.activeFilter === category ? null : category;
        }
        
        this.nodes.forEach(node => {
            const nodeEl = document.getElementById(`node-${node.id}`);
            if (nodeEl) {
                if (this.activeFilter === null || node.category === this.activeFilter) {
                    nodeEl.style.display = 'block';
                } else {
                    nodeEl.style.display = 'none';
                }
            }
        });
        
        this.connectionManager.updateAllConnections(this.nodes);
        this.updateFilterButtons();
        
        if (this.minimapVisible) {
            this.updateMinimap();
        }
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Update filter button states
    updateFilterButtons: function() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            const category = btn.getAttribute('data-category');
            if ((category === 'all' && this.activeFilter === null) || category === this.activeFilter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Clear canvas with unified cleanup
    clearCanvas: function() {
        if (this.nodes.length === 0) return;
        
        if (confirm('Clear all chat nodes? This cannot be undone.')) {
            // Clear state
            this.focusedNodeId = null;
            this.nodes = [];
            this.totalMessages = 0;
            this.selectedNode = null;
            
            // Use unified connection manager to clear all connections
            this.connectionManager.clear();
            
            // Remove all chat nodes
            document.querySelectorAll('.chat-node').forEach(el => el.remove());
            
            // Clear localStorage
            localStorage.removeItem('llm-canvas-autosave');
            
            // Reset filter states
            this.activeFilter = null;
            this.updateFilterButtons();
            
            // Update UI
            this.updateStats();
            this.updateEmptyState();
            this.updateCanvasSize();
            
            if (this.minimapVisible) {
                this.updateMinimap();
            }
        }
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Update statistics
    updateStats: function() {
        document.getElementById('nodeCount').textContent = this.nodes.length;
        document.getElementById('messageCount').textContent = this.totalMessages;
        
        // Update category counts
        const categoryCounts = {};
        this.nodes.forEach(node => {
            categoryCounts[node.category] = (categoryCounts[node.category] || 0) + 1;
        });
        
        // Update "Display All" button with total count
        const allBtn = document.querySelector('[data-category="all"]');
        if (allBtn) {
            allBtn.innerHTML = `<span class="color-chip" style="background-color: #374151;"></span>Display All (${this.nodes.length})`;
        }
        
        // Update category filter buttons with counts
        Object.keys(this.categories).forEach(categoryKey => {
            const count = categoryCounts[categoryKey] || 0;
            const btn = document.querySelector(`[data-category="${categoryKey}"]`);
            if (btn) {
                const categoryName = this.categories[categoryKey].name;
                const categoryColor = this.categories[categoryKey].color;
                btn.innerHTML = `<span class="color-chip" style="background-color: ${categoryColor};"></span>${categoryName} (${count})`;
            }
        });
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Update empty state
    updateEmptyState: function() {
        const emptyState = document.getElementById('emptyState');
        emptyState.style.display = this.nodes.length === 0 ? 'flex' : 'none';
    },

    // Auto-save functionality
    enableAutoSave: function() {
        setInterval(() => {
            this.autoSave();
        }, 30000);
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    autoSave: function() {
        if (this.nodes.length > 0) {
            const sessionData = {
                nodes: this.nodes,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('llm-canvas-autosave', JSON.stringify(sessionData));
        }
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Load auto-save
    loadAutoSave: function() {
        const saved = localStorage.getItem('llm-canvas-autosave');
        if (saved) {
            try {
                const sessionData = JSON.parse(saved);
                if (sessionData.nodes && sessionData.nodes.length > 0) {
                    this.nodes = [];
                    document.querySelectorAll('.chat-node').forEach(el => el.remove());
                    this.loadSessionData(sessionData);
                    
                    setTimeout(() => {
                        if (this.minimapVisible) {
                            this.updateMinimap();
                        }
                    }, 300);
                    
                    return true;
                }
            } catch (e) {
                console.error('Error loading auto-save:', e);
            }
        }
        return false;
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Save session to file
    saveSession: function(toServer = false) {
        const sessionData = {
            nodes: this.nodes,
            timestamp: new Date().toISOString()
        };
        
        if (toServer) {
            alert('Server save not implemented yet');
        } else {
            const dataStr = JSON.stringify(sessionData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `llm-canvas-session-${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
        }
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Load session from file
    loadSessionFromFile: function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const sessionData = JSON.parse(e.target.result);
                        this.loadSessionData(sessionData);
                    } catch (error) {
                        alert('Error loading session file: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Load session data with unified state management
    loadSessionData: function(sessionData) {
        console.log('Loading session data...');
        
        // Clear current session efficiently
        this.focusedNodeId = null;
        this.nodes = [];
        this.totalMessages = 0;
        this.selectedNode = null;
        this.connectionManager.clear();
        
        // Remove existing nodes
        document.querySelectorAll('.chat-node').forEach(el => el.remove());

        // Create mapping from old IDs to new IDs
        const idMapping = {};
        let originNodeId = null;
        const nodesToConvert = [];
        
        if (sessionData.nodes) {
            // Process all node data first
            const processedNodes = sessionData.nodes.map(nodeData => {
                const oldId = nodeData.id;
                
                // Ensure safe positioning
                let safeY = nodeData.y;
                if (safeY < NodeState.MINIMUM_Y) {
                    safeY = NodeState.MINIMUM_Y;
                }
                
                const node = {
                    ...nodeData,
                    id: this.nodeIdCounter++,
                    width: NodeState.EXPANDED.width,
                    height: NodeState.EXPANDED.height,
                    y: safeY
                };
                
                idMapping[oldId] = node.id;
                
                // Check if this is the origin node
                if (node.title === 'Origin Prompt' || node.title.toLowerCase().includes('origin')) {
                    originNodeId = node.id;
                    if (node.y < NodeState.MINIMUM_Y) {
                        node.y = NodeState.MINIMUM_Y;
                    }
                } else {
                    nodesToConvert.push(node.id);
                }
                
                return node;
            });
            
            // Add all processed nodes to the array
            this.nodes = processedNodes;
            
            // Update parent IDs using the mapping
            this.nodes.forEach(node => {
                const originalNodeData = sessionData.nodes.find(original => idMapping[original.id] === node.id);
                if (originalNodeData && originalNodeData.parentId) {
                    node.parentId = idMapping[originalNodeData.parentId];
                }
            });
            
            // Render all nodes
            this.nodes.forEach(node => this.renderNode(node));
            
            // Convert nodes to boxes (except origin)
            nodesToConvert.forEach(nodeId => {
                this.convertNodeToBox(nodeId);
            });
            
            // Set origin as focused
            if (originNodeId) {
                this.focusedNodeId = originNodeId;
                const originEl = document.getElementById(`node-${originNodeId}`);
                if (originEl) {
                    originEl.style.zIndex = '100';
                }
            }
            
            // Restore all messages
            this.restoreAllMessages(sessionData.nodes, idMapping);
            
            // Create all connections
            setTimeout(() => {
                this.connectionManager.updateAllConnections(this.nodes);
                this.updateCanvasSize();
                if (this.minimapVisible) {
                    this.updateMinimap();
                }
                this.updateStats();
                console.log('Session loaded successfully');
            }, 100);
        }
    },


// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------


    // Restore all messages for loaded nodes
    restoreAllMessages: function(originalNodesData, idMapping) {
        originalNodesData.forEach(originalNode => {
            if (originalNode.messages && originalNode.messages.length > 0) {
                const newNodeId = idMapping[originalNode.id];
                const node = this.nodes.find(n => n.id === newNodeId);
                
                if (node) {
                    node.messages = originalNode.messages;
                    this.totalMessages += originalNode.messages.length;
                    
                    // Only restore DOM messages for expanded nodes
                    if (!node.isBoxView) {
                        const messagesEl = document.getElementById(`messages-${newNodeId}`);
                        if (messagesEl) {
                            const messagesHTML = originalNode.messages.map(msg => {
                                const formattedContent = this.formatMessageContent(msg.content);
                                return `<div class="message ${msg.role}">${formattedContent}</div>`;
                            }).join('');
                            
                            messagesEl.innerHTML = messagesHTML;
                            messagesEl.scrollTop = messagesEl.scrollHeight;
                        }
                    }
                }
            }
        });
    }
};



// --------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------



// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    LLMCanvas.init();
});