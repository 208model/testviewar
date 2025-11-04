// Script to initialize MediaPipe Pose detection and control PlayCanvas entities.
var PoseDetector = pc.createScript('poseDetector');

// Attribute to adjust the sensitivity/scale of 3D movement
PoseDetector.attributes.add('movementScale', {
    type: 'number',
    default: 10,
    title: 'Movement Scale',
});

// initialize code called once per entity
PoseDetector.prototype.initialize = function() {
    this.poses = null;
    this.videoElement = null;
    this.canvasElement = null;
    this.pose = null;
    this.mediaPipeReady = false;
    this.objectsListed = false;
    this.setupAttempted = false;

    console.log('🚀 PoseDetector initialized');

    // 1. Create the HTML elements first
    this.createCameraElements();

    // 2. Load MediaPipe libraries dynamically
    this.loadMediaPipeLibraries();
};

// Load MediaPipe libraries dynamically
PoseDetector.prototype.loadMediaPipeLibraries = function() {
    var self = this;
    
    console.log('📦 Loading MediaPipe libraries...');
    
    // Library URLs - UPDATED TO LATEST VERSION
    var libraries = [
        'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js'
    ];
    
    var loadedCount = 0;
    
    function onLibraryLoaded() {
        loadedCount++;
        console.log('✅ Loaded ' + loadedCount + '/' + libraries.length + ' libraries');
        
        if (loadedCount === libraries.length) {
            console.log('✅ All MediaPipe libraries loaded!');
            self.waitForMediaPipe();
        }
    }
    
    function onLibraryError(url) {
        console.error('❌ Failed to load library:', url);
    }
    
    // Load each library
    libraries.forEach(function(url) {
        var script = document.createElement('script');
        script.src = url;
        script.crossOrigin = 'anonymous';
        script.onload = onLibraryLoaded;
        script.onerror = function() { onLibraryError(url); };
        document.head.appendChild(script);
    });
};

// Wait for MediaPipe libraries to be available
PoseDetector.prototype.waitForMediaPipe = function() {
    var self = this;
    var attempts = 0;
    var maxAttempts = 50;

    function checkLibraries() {
        attempts++;
        
        // Check if all required MediaPipe objects exist
        var poseExists = (typeof window.Pose !== 'undefined');
        var drawConnectorsExists = (typeof window.drawConnectors !== 'undefined');
        var drawLandmarksExists = (typeof window.drawLandmarks !== 'undefined');
        var poseConnectionsExists = (typeof window.POSE_CONNECTIONS !== 'undefined');
        
        if (attempts === 1 || attempts % 10 === 0) {
            console.log('🔍 Check #' + attempts + ':', {
                Pose: poseExists,
                drawConnectors: drawConnectorsExists,
                drawLandmarks: drawLandmarksExists,
                POSE_CONNECTIONS: poseConnectionsExists
            });
        }
        
        if (poseExists && drawConnectorsExists && drawLandmarksExists && poseConnectionsExists) {
            console.log('✅ MediaPipe libraries ready!');
            self.mediaPipeReady = true;
            self.setupCamera();
        } else if (attempts < maxAttempts) {
            setTimeout(checkLibraries, 300);
        } else {
            console.error('❌ MediaPipe libraries failed to load');
            self.showError('Failed to load MediaPipe libraries. Please refresh the page.');
        }
    }
    
    checkLibraries();
};

// CreateCameraElements
// CreateCameraElements - CENTERED VERSION
PoseDetector.prototype.createCameraElements = function() {
    // Create Video Element - CENTERED
    this.videoElement = document.createElement('video');
    this.videoElement.id = 'videoElement';
    this.videoElement.playsInline = true;
    this.videoElement.autoplay = true;
    this.videoElement.muted = true;
    this.videoElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scaleX(-1);
        width: 640px;
        height: 480px;
        max-width: 90vw;
        max-height: 90vh;
        opacity: 1.0;
        z-index: 100;
        border: 3px solid #00FF00;
        border-radius: 10px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        object-fit: cover;
    `;
    document.body.appendChild(this.videoElement);

    // Create Canvas Element (for drawing skeleton) - CENTERED
    this.canvasElement = document.createElement('canvas');
    this.canvasElement.id = 'canvasElement';
    this.canvasElement.width = 640;
    this.canvasElement.height = 480;
    this.canvasElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 640px;
        height: 480px;
        max-width: 90vw;
        max-height: 90vh;
        z-index: 101;
        pointer-events: none;
    `;
    document.body.appendChild(this.canvasElement);

    // Create toggle button - TOP RIGHT
    var toggleBtn = document.createElement('button');
    toggleBtn.textContent = '👁️ Hide Camera';
    toggleBtn.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        z-index: 102;
        font-size: 16px;
        font-family: Arial;
        font-weight: bold;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
    `;
    
    var self = this;
    var visible = true;
    
    toggleBtn.onclick = function() {
        visible = !visible;
        if (visible) {
            self.videoElement.style.opacity = '1.0';
            self.canvasElement.style.opacity = '1.0';
            toggleBtn.textContent = '👁️ Hide Camera';
            toggleBtn.style.background = '#4CAF50';
        } else {
            self.videoElement.style.opacity = '0';
            self.canvasElement.style.opacity = '0';
            toggleBtn.textContent = '👁️ Show Camera';
            toggleBtn.style.background = '#FF5722';
        }
    };
    
    toggleBtn.onmouseover = function() {
        this.style.transform = 'scale(1.05)';
    };
    
    toggleBtn.onmouseout = function() {
        this.style.transform = 'scale(1)';
    };
    
    document.body.appendChild(toggleBtn);

    console.log('✅ Video and Canvas elements created (centered)');
};

   
// Setup Camera
PoseDetector.prototype.setupCamera = function() {
    var self = this;
    
    if (!this.videoElement) {
        console.error('❌ Video element not found!');
        return;
    }
    
    console.log('📹 Requesting camera access...');
    
    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
        }
    })
    .then(function(stream) {
        console.log('✅ Camera access granted');
        self.videoElement.srcObject = stream;
        
        // Try multiple events to ensure we catch when video is ready
        self.videoElement.onloadedmetadata = function() {
            console.log('✅ Metadata loaded - Video dimensions:', self.videoElement.videoWidth + 'x' + self.videoElement.videoHeight);
            self.initializeMediaPipe();
        };
        
        self.videoElement.onloadeddata = function() {
            console.log('✅ Video data loaded');
            if (!self.setupAttempted) {
                self.initializeMediaPipe();
            }
        };
        
        return self.videoElement.play();
    })
    .then(function() {
        console.log('✅ Video.play() completed');
        
        // Backup timeout
        setTimeout(function() {
            if (!self.setupAttempted) {
                console.warn('⚠️ Forcing MediaPipe setup after timeout');
                self.initializeMediaPipe();
            }
        }, 2000);
    })
    .catch(function(err) {
        console.error('❌ Camera Error:', err);
        self.showError('Camera Access Denied. Please allow camera access and refresh.');
    });
};

// Initialize MediaPipe (extracted to avoid duplicate calls)
PoseDetector.prototype.initializeMediaPipe = function() {
    if (this.setupAttempted) {
        console.log('⏭️ MediaPipe setup already attempted, skipping');
        return;
    }
    
    this.setupAttempted = true;
    
    // Set canvas dimensions
    if (this.videoElement.videoWidth > 0) {
        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;
        console.log('✅ Canvas resized to:', this.canvasElement.width + 'x' + this.canvasElement.height);
    } else {
        console.warn('⚠️ Video dimensions not ready, using defaults');
    }
    
    this.setupMediaPipe();
};

// Show error message
PoseDetector.prototype.showError = function(text) {
    var message = document.createElement('div');
    message.textContent = '❌ ' + text;
    message.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:#ff4444; color:white; padding:20px; border-radius:10px; z-index:9999; font-family:Arial; font-size:16px; text-align:center; box-shadow: 0 4px 6px rgba(0,0,0,0.3);';
    document.body.appendChild(message);
};

// Setup MediaPipe
PoseDetector.prototype.setupMediaPipe = function() {
    var self = this;
    
    if (!this.mediaPipeReady) {
        console.error('❌ MediaPipe not ready');
        return;
    }
    
    console.log('🎯 Initializing MediaPipe Pose...');
    
    try {
        this.pose = new window.Pose({
            locateFile: function(file) {
                // Use latest version from CDN
                return 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/' + file;
            }
        });
        
        this.pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        this.pose.onResults(function(results) {
            self.onPoseResults(results);
        });
        
        console.log('✅ MediaPipe Pose configured');
        
        // Start detection immediately (no initialize call needed for newer versions)
        this.startDetection();
        
    } catch (e) {
        console.error('❌ Error setting up Pose:', e);
        this.showError('Failed to initialize Pose detection: ' + e.message);
    }
};

// Start Detection Loop
PoseDetector.prototype.startDetection = function() {
    var self = this;
    var isProcessing = false;
    var frameCount = 0;
    
    console.log('🎬 Starting detection loop...');
    
    function detectFrame() {
        if (!isProcessing && self.videoElement && self.pose && self.videoElement.readyState >= 2) {
            isProcessing = true;
            frameCount++;
            
            if (frameCount === 1) {
                console.log('🎥 First frame sent to MediaPipe');
            }
            
            self.pose.send({image: self.videoElement})
                .then(function() {
                    isProcessing = false;
                    if (frameCount === 1) {
                        console.log('✅ First frame processed successfully');
                    }
                })
                .catch(function(err) {
                    if (frameCount <= 5) {
                        console.error('❌ Detection error on frame', frameCount, ':', err);
                    }
                    isProcessing = false;
                });
        }
        requestAnimationFrame(detectFrame);
    }
    
    detectFrame();
};

// Process Pose Results
PoseDetector.prototype.onPoseResults = function(results) {
    if (results.poseLandmarks) {
        this.poses = results.poseLandmarks;
        
        // Log only first detection
        if (!this.firstDetection) {
            this.firstDetection = true;
            console.log('✅ First pose detected! Landmarks:', results.poseLandmarks.length);
        }
        
        this.drawPose(results);
        this.updatePlayCanvasObjects(results.poseLandmarks);
    } else {
        // Log only first miss
        if (this.firstDetection && !this.noDetectionWarned) {
            this.noDetectionWarned = true;
            console.warn('⚠️ No pose detected - move back or ensure upper body is visible');
            var self = this;
            setTimeout(function() {
                self.noDetectionWarned = false;
            }, 3000);
        }
    }
};

// Draw Pose on Canvas
PoseDetector.prototype.drawPose = function(results) {
    var canvasCtx = this.canvasElement.getContext('2d');
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    
    // Mirror the canvas to match the mirrored video
    canvasCtx.translate(this.canvasElement.width, 0);
    canvasCtx.scale(-1, 1);
    
    if (results.poseLandmarks) {
        // Draw connections (skeleton) - GREEN
        window.drawConnectors(canvasCtx, results.poseLandmarks, window.POSE_CONNECTIONS, {
            color: '#00FF00',
            lineWidth: 6
        });
        
        // Draw landmarks (joints) - RED with YELLOW fill
        window.drawLandmarks(canvasCtx, results.poseLandmarks, {
            color: '#FF0000',
            lineWidth: 3,
            radius: 10,
            fillColor: '#FFFF00'
        });
        
        // Draw text indicator
        canvasCtx.scale(-1, 1);
        canvasCtx.translate(-this.canvasElement.width, 0);
        canvasCtx.fillStyle = '#00FF00';
        canvasCtx.font = 'bold 24px Arial';
        canvasCtx.shadowColor = 'black';
        canvasCtx.shadowBlur = 4;
        canvasCtx.fillText('✓ TRACKING', 10, 35);
        canvasCtx.shadowBlur = 0;
    } else {
        canvasCtx.fillStyle = '#FF0000';
        canvasCtx.font = 'bold 20px Arial';
        canvasCtx.shadowColor = 'black';
        canvasCtx.shadowBlur = 4;
        canvasCtx.fillText('NO POSE', 10, 35);
        canvasCtx.shadowBlur = 0;
    }
    
    canvasCtx.restore();
};

// Update PlayCanvas Objects
PoseDetector.prototype.updatePlayCanvasObjects = function(landmarks) {
    var scale = this.movementScale;
    
    // List all objects in scene (only once)
    if (!this.objectsListed) {
        this.objectsListed = true;
        console.log('📦 Objects in scene:');
        var allObjects = this.app.root.children;
        allObjects.forEach(function(obj) {
            console.log('  - ' + obj.name);
        });
    }
    
    // Track Left Shoulder (Landmark 11) for 'TargetSphere'
    var leftShoulder = landmarks[11];
    if (leftShoulder && leftShoulder.visibility > 0.5) {
        var x = (leftShoulder.x - 0.5) * scale;
        var y = -(leftShoulder.y - 0.5) * scale;
        var z = -leftShoulder.z * scale;
        
        var targetObject = this.app.root.findByName('TargetSphere');
        if (targetObject) {
            targetObject.setPosition(x, y, z);
            
            // Log only first successful update
            if (!this.targetSphereFound) {
                this.targetSphereFound = true;
                console.log('🎯 TargetSphere tracking! Pos:', x.toFixed(1), y.toFixed(1), z.toFixed(1));
            }
        } else if (!this.targetSphereMissing) {
            this.targetSphereMissing = true;
            console.error('❌ TargetSphere not found! Check name in Hierarchy.');
        }
    }
    
    // Track Right Wrist (Landmark 16) for 'RightHandTarget'
    var rightWrist = landmarks[16];
    if (rightWrist && rightWrist.visibility > 0.5) {
        var x_hand = (rightWrist.x - 0.5) * scale;
        var y_hand = -(rightWrist.y - 0.5) * scale;
        var z_hand = -rightWrist.z * scale;
        
        var handTarget = this.app.root.findByName('RightHandTarget');
        if (handTarget) {
            handTarget.setPosition(x_hand, y_hand, z_hand);
            
            // Log only first successful update
            if (!this.rightHandFound) {
                this.rightHandFound = true;
                console.log('✋ RightHandTarget tracking! Pos:', x_hand.toFixed(1), y_hand.toFixed(1), z_hand.toFixed(1));
            }
        } else if (!this.rightHandMissing) {
            this.rightHandMissing = true;
            console.error('❌ RightHandTarget not found! Check name in Hierarchy.');
        }
    }
};

// update code called every frame
PoseDetector.prototype.update = function(dt) {
    // Game logic can be added here
};