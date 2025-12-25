<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Research Canvas - DeepSeek API</title>
    <link rel="stylesheet" href="llm-canvas.css">
</head>
<body>
 

    <!-- Single canvas container -->
    <div class="canvas" id="canvas">
        <div class="canvas-content" id="canvasContent">
            <div class="grid-bg"></div>
        </div>

        <!-- Toolbar -->
        <div class="toolbar">
            <button class="toolbar-toggle" id="toolbarToggle" onclick="LLMCanvas.toggleToolbar()" title="Hide toolbar">×</button>
            <div class="toolbar-content">
                <button class="btn btn-primary" onclick="LLMCanvas.createNode()">
                    + New Chat
                </button>
                <button class="btn btn-primary" onclick="LLMCanvas.clearCanvas()">
                    Clear All
                </button>
                <button class="btn btn-secondary" onclick="LLMCanvas.saveSession(false)">
                    💾 Save Local
                </button>
                <button class="btn btn-secondary" onclick="LLMCanvas.loadSessionFromFile()">
                    📁 Load File
                </button>
            </div>
        </div>

        <!-- Page Title -->
        <div class="page-title">
            &nbsp;&nbsp; A I &nbsp;&nbsp; R e s e a r c h &nbsp;&nbsp; C a n v a s
            <button class="example-download-btn" onclick="showDownloadInfo()">
                Download Example JSON 📥
            </button>
        </div>

        <!-- Download Info Modal -->
        <div class="modal-overlay" id="downloadModal" onclick="hideDownloadInfo()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>Download Example JSON</h3>
                    <button class="modal-close" onclick="hideDownloadInfo()">×</button>
                </div>
                <div class="modal-body">
                    <p>Download a JSON example of a research project. This is the type of file you'll be able to create and save on your local computer for your research project. It allows you to share your project with any other user of this site.</p>
                </div>
                <div class="modal-footer">
                    <a href="/ai-canvas-2/ai-canvas-example-json-saved-file.json" download class="btn btn-primary" onclick="hideDownloadInfo()">
                        Download File 📥
                    </a>
                    <button class="btn btn-secondary" onclick="hideDownloadInfo()">Cancel</button>
                </div>
            </div>
        </div>


    <!-- Welcome Modal -->
        <div class="modal-overlay" id="welcomeModal" style="display: none;">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>Welcome to AI Research Canvas</h3>
                    <button class="modal-close" onclick="hideWelcomeModal()">×</button>
                </div>
                <div class="modal-body">
                    <p>By default an example research project has been loaded. To clear it, click the 'Clear All' button in the upper left navigation.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="hideWelcomeModal()">Got it!</button>
                </div>
            </div>
        </div>


        <!-- Stats Panel -->
        <div class="stats-panel">
            <button class="stats-toggle" id="statsPanelToggle" onclick="LLMCanvas.toggleStatsPanel()" title="Hide stats panel">×</button>
            <div class="stats-content">
                <div style="font-weight: 600; margin-bottom: 12px; color: #1f2937;">Canvas Stats</div>
                <div class="stat-item">
                    <span class="stat-label">Active Nodes:</span>
                    <span class="stat-value" id="nodeCount">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Messages:</span>
                    <span class="stat-value" id="messageCount">0</span>
                </div>
                
                <div style="font-weight: 600; margin: 16px 0 8px 0; color: #1f2937;">Navigation</div>
                <button class="btn btn-small" onclick="LLMCanvas.toggleMinimap()">Toggle Map</button>
                
                <div style="font-weight: 600; margin: 16px 0 8px 0; color: #1f2937;">Filter by Category</div>
                <div class="filter-buttons">
                    <button class="filter-btn" data-category="all" onclick="LLMCanvas.filterByCategory('all')">
                        <span class="color-chip" style="background-color: #374151;"></span>Display All (0)
                    </button>
                    <button class="filter-btn" data-category="general" onclick="LLMCanvas.filterByCategory('general')">
                        <span class="color-chip" style="background-color: #64748b;"></span>General (0)
                    </button>
                    <button class="filter-btn" data-category="research" onclick="LLMCanvas.filterByCategory('research')">
                        <span class="color-chip" style="background-color: #3b82f6;"></span>Research (0)
                    </button>
                    <button class="filter-btn" data-category="creative" onclick="LLMCanvas.filterByCategory('creative')">
                        <span class="color-chip" style="background-color: #10b981;"></span>Creative (0)
                    </button>
                    <button class="filter-btn" data-category="problem" onclick="LLMCanvas.filterByCategory('problem')">
                        <span class="color-chip" style="background-color: #f59e0b;"></span>Problem Solving (0)
                    </button>
                    <button class="filter-btn" data-category="planning" onclick="LLMCanvas.filterByCategory('planning')">
                        <span class="color-chip" style="background-color: #8b5cf6;"></span>Planning (0)
                    </button>
                    <button class="filter-btn" data-category="learning" onclick="LLMCanvas.filterByCategory('learning')">
                        <span class="color-chip" style="background-color: #ef4444;"></span>Learning (0)
                    </button>
                </div>
            </div>
        </div>

        <!-- Minimap -->
        <div class="minimap" id="minimap">
            <div class="minimap-header">
                <span>Canvas Map</span>
                <button class="minimap-close" onclick="LLMCanvas.toggleMinimap()">×</button>
            </div>
            <div class="minimap-content" id="minimapContent">
                <div class="minimap-viewport" id="minimapViewport"></div>
            </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" id="emptyState">
            <div>
                <div style="font-size: 48px; margin-bottom: 16px; background: linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%); border: 3px solid #0288d1; border-radius: 50px; padding: 20px 30px; display: inline-block; position: relative;">
                    <span style="color: #0277bd; font-weight: bold;">☁️ Start New Project</span>
                </div>
                <h2 style="font-size: 24px; font-weight: 600; margin-bottom: 8px;">AI Research Canvas</h2>
                <p style="font-size: 16px; opacity: 0.8;">Create your first chat node</p>
                <p style="font-size: 14px; opacity: 0.6; margin-top: 8px;">DeepSeek AI • Select text + Shift+F to fork</p>
            </div>
        </div>

        <!-- Fork Hint -->
        <div class="fork-hint">
            💡 Select text in any message and press Shift + F to fork conversation
        </div>
    </div>

    <script>
        // Simple DOM ready check
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM loaded, LLMCanvas should be ready');
        }); 

        function showDownloadInfo() {
            document.getElementById('downloadModal').style.display = 'block';
        }

        function hideDownloadInfo() {
            document.getElementById('downloadModal').style.display = 'none';
        }

        function showWelcomeModal() {
            document.getElementById('welcomeModal').style.display = 'block';
        }

        function hideWelcomeModal() {
            document.getElementById('welcomeModal').style.display = 'none';
            // Mark that user has seen the welcome modal
            localStorage.setItem('llm-canvas-welcome-shown', 'true');
        }


    </script>

    <script src="llm-canvas.js" type="text/javascript"></script>
</body>
</html>