const startVideoCapture = document.querySelector('button.btn-success');
const stopVideoCapture = document.querySelector('button.btn-danger');
const videoList = document.querySelector('select.custom-select');
const videoContainer = document.querySelector('.video-container');
const liveFeedElement = document.querySelector('video#liveFeed');
let videoListCurrentActive = 0;
let model = undefined;
let is_new_model = false;
let liveFeedAnimationID = undefined;
let children = [];
const ANCHORS = [0.573, 0.677, 1.87, 2.06, 3.34, 5.47, 7.88, 3.53, 9.77, 9.17];
const NEWER_MODEL_OUTPUT_TENSORS = ['detected_boxes', 'detected_scores', 'detected_classes'];

// Function to update the select element with the provided set of cameras
const updateCameraList = (cameras, activeDeviceId = undefined) => {
    videoList.innerHTML = '<option value="Select Device" disabled>Select Video Capture Device</option>';
    cameras.forEach(camera => {
        const cameraOption = document.createElement('option');
        cameraOption.text = camera.label;
        cameraOption.value = camera.deviceId;
        if (activeDeviceId && camera.deviceId == activeDeviceId) {
            cameraOption.selected = true;
        }
        videoList.add(cameraOption)
    });
    
    videoListCurrentActive = videoList.selectedIndex;
}

// Function to watch for new video input devices and call function to update media device list
const getVideoDevices = async (activeDeviceId = undefined) => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    updateCameraList( devices.filter(device => device.kind === 'videoinput'), activeDeviceId );
}

// Fucntion to Open camera and start live stream
const playVideoFromCamera = async (cameraId = undefined) => {
    let constraints = {}; 
    if (cameraId) {
        constraints = {
            'video': {
                'deviceId': cameraId,
            }
        }
    } else {
        constraints = {
            video: { 'facingMode': "User" }
        }
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        // Get the initial set of video devices connected
        getVideoDevices(cameraId ? cameraId :stream.getTracks()[0].getSettings().deviceId);
        // render stream in video element
        liveFeedElement.srcObject = stream;
        liveFeedElement.onloadeddata = predictLiveCam;
    }
    catch (err) {
        throw Error(err.message);
    }
}

// Function to stop live video stream from camera
const stopVideoFromCamera = () => {
    const stream = liveFeedElement.srcObject;
    const tracks = stream.getTracks();

    tracks.forEach(function(track) {
        track.stop();
    });
    
    // Remove drawn bounding boxes
    removeHighlights();
    // Call this function again to stop continous prediction when the browser is ready.
    window.cancelAnimationFrame(liveFeedAnimationID);
    // Stop liveFeed by setting video source to null
    liveFeedElement.srcObject = null;
}

// Function to check if webcam/camera is supported.
const checkMediaSupported = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Function to update UI after clicking Start button
const showStartControls = () => {
    startVideoCapture.disabled = false;
    startVideoCapture.classList.contains('disabled') ? '' : startVideoCapture.classList.add('disabled');
    startVideoCapture.classList.contains('d-none') ? '' : startVideoCapture.classList.add('d-none');
    
    videoList.disabled = false;
    videoList.classList.contains('disabled') ? videoList.classList.remove('disabled') : '';
    videoList.classList.contains('d-none') ? videoList.classList.remove('d-none') : '';
    
    stopVideoCapture.disabled = false;
    stopVideoCapture.classList.contains('disabled') ? stopVideoCapture.classList.remove('disabled') : '';
    stopVideoCapture.classList.contains('d-none') ? stopVideoCapture.classList.remove('d-none') : '';
}

// Function to update UI after clicking Stop button
const hideStartControls = () => {
    stopVideoCapture.disabled = true;
    stopVideoCapture.classList.contains('disabled') ? '': stopVideoCapture.classList.add('disabled');
    stopVideoCapture.classList.contains('d-none') ? '': stopVideoCapture.classList.add('d-none');

    videoList.disabled = true;
    videoList.classList.contains('disabled') ? '': videoList.classList.add('disabled');
    videoList.classList.contains('d-none') ? '': videoList.classList.add('d-none');
    
    startVideoCapture.disabled = false;
    startVideoCapture.classList.contains('disabled') ? startVideoCapture.classList.remove('disabled') : '';
    startVideoCapture.classList.contains('d-none') ? startVideoCapture.classList.remove('d-none') : '';
}

// Listen for changes to media devices and update the list accordingly
navigator.mediaDevices.addEventListener('devicechange', event => {
    getVideoDevices();
});

// Function to change stream devices from select drop down
videoList.addEventListener('change', (event) => {
    if ( event.target.selectedIndex != 0 && event.target.selectedIndex != videoListCurrentActive) {
        stopVideoFromCamera();
        playVideoFromCamera(event.target.value).catch((err) => {
            hideStartControls();
            alert(err.message);
        });
    }
});

// Function to show/update model loading progress
const showProgress = (percentage) => {
    var pct = Math.floor(percentage*100.0);
    startVideoCapture.lastChild.textContent = `Loading Model (${pct}%)...`;
}

// Function to calculate mathematical logirithmic values
const _logistic = (x) => {
    if (x > 0) {
        return (1 / (1 + Math.exp(-x)));
    } else {
        const e = Math.exp(x);
        return e / (1 + e);
    }
}

const detectObjectsInFrame = async (videoFrame) => {

    //Wait till next video frame
    // await tf.nextFrame();

    // pre-processing video frame
    console.log( "Pre-processing Video Frame..." );
    const input_size = model.inputs[0].shape[1];
    let image = tf.browser.fromPixels(videoFrame, 3);
    image = tf.image.resizeBilinear(image.expandDims().toFloat(), [input_size, input_size]);
    
    // RGB->BGR for old models
    is_new_model ? console.log( "Object Detection Model V2 detected." ) : image = image.reverse(-1);

    console.log( "Running predictions..." );
    
    const outputs = model.execute(image, is_new_model ? NEW_OD_OUTPUT_TENSORS : null);
    image.dispose();
    const arrays = !Array.isArray(outputs) ? outputs.array() : Promise.all(outputs.map(t => t.array()));
    outputs.dispose();
    let predictions = await arrays;

    // Extra Processing for Version-1 models.
    if (predictions.length != 3) {
        console.log( "Post processing for ver.1 models..." );
        
        const num_anchor = ANCHORS.length / 2;
        const channels = predictions[0][0][0].length;
        const height = predictions[0].length;
        const width = predictions[0][0].length;

        const num_class = channels / num_anchor - 5;

        let boxes = [];
        let scores = [];
        let classes = [];

        for (var grid_y = 0; grid_y < height; grid_y++) {
            for (var grid_x = 0; grid_x < width; grid_x++) {
                let offset = 0;

                for (var i = 0; i < num_anchor; i++) {
                    let x = (_logistic(predictions[0][grid_y][grid_x][offset++]) + grid_x) / width;
                    let y = (_logistic(predictions[0][grid_y][grid_x][offset++]) + grid_y) / height;
                    let w = Math.exp(predictions[0][grid_y][grid_x][offset++]) * ANCHORS[i * 2] / width;
                    let h = Math.exp(predictions[0][grid_y][grid_x][offset++]) * ANCHORS[i * 2 + 1] / height;

                    let objectness = tf.scalar(_logistic(predictions[0][grid_y][grid_x][offset++]));
                    let class_probabilities = tf.tensor1d(predictions[0][grid_y][grid_x].slice(offset, offset + num_class)).softmax();
                    offset += num_class;

                    class_probabilities = class_probabilities.mul(objectness);
                    let max_index = class_probabilities.argMax();
                    boxes.push([x - w / 2, y - h / 2, x + w / 2, y + h / 2]);
                    scores.push(class_probabilities.max().dataSync()[0]);
                    classes.push(max_index.dataSync()[0]);
                }
            }
        }

        boxes = tf.tensor2d(boxes);
        scores = tf.tensor1d(scores);
        classes = tf.tensor1d(classes);

        const selected_indices = await tf.image.nonMaxSuppressionAsync(boxes, scores, 10);
        predictions = [await boxes.gather(selected_indices).array(), await scores.gather(selected_indices).array(), await classes.gather(selected_indices).array()];
        boxes.dispose(); scores.dispose(); classes.dispose();
    }
    highlightResults(predictions);
}

// Function to predict classes from live stream
const predictLiveCam = async () => {
    // call for every frame
    detectObjectsInFrame(liveFeedElement).then(() => {
        // Call this function again to keep predicting when the browser is ready.
        liveFeedAnimationID = window.requestAnimationFrame(predictLiveCam);
    });
}

// Fucntion to create bounding boxes based on predictions
const highlightResults = (predictions) => {
    console.log( "Highlighting results..." );
    
    removeHighlights();
    
    for (let n = 0; n < predictions[0].length; n++) {
        // Check scores
        if (predictions[1][n] > 0.20) {
            console.log(predictions);
            const p = document.createElement('p');
            p.innerText = TARGET_CLASSES[predictions[2][n]]  + ': ' 
                + Math.round(parseFloat(predictions[1][n]) * 100) 
                + '%';
            
                bboxLeft = (predictions[0][n][0] * liveFeedElement.videoWidth) + 10;
                bboxTop = (predictions[0][n][1] * liveFeedElement.videoHeight) - 10;
                bboxWidth = (predictions[0][n][2] * liveFeedElement.videoWidth) - bboxLeft + 20;
                bboxHeight = (predictions[0][n][3] * liveFeedElement.videoHeight) - bboxTop + 10;
            
            p.style = 'margin-left: ' + bboxLeft + 'px; margin-top: '
                + (bboxTop - 10) + 'px; width: ' 
                + bboxWidth + 'px; top: 0; left: 0;';
            const highlighter = document.createElement('div');
            highlighter.setAttribute('class', 'highlighter');
            highlighter.style = 'left: ' + bboxLeft + 'px; top: '
                + bboxTop + 'px; width: ' 
                + bboxWidth + 'px; height: '
                + bboxHeight + 'px;';
            videoContainer.appendChild(highlighter);
            videoContainer.appendChild(p);
            children.push(highlighter);
            children.push(p);
        }
    }
}

// Function to remove bounding boxes/highlights
const removeHighlights = () => {
    for (let i = 0; i < children.length; i++) {
        videoContainer.removeChild(children[i]);
    }
    children = [];
}

// 1. Ask user camera permissions, if denied show error
// 2. Populate dropdown select with available videoInput devices
// 3. Select front-facing videoInput device by default
// 4. Hide Start button and show Stop button
startVideoCapture.addEventListener('click', event => {
    playVideoFromCamera().then(()=>{
        showStartControls();
    }).catch((err) => {alert(err.message)});
});

stopVideoCapture.addEventListener('click', event => {
    stopVideoFromCamera();
    hideStartControls();
});

// Main application entry point
const app = async () => {
    const checkMediaSupport = checkMediaSupported();
    if (!checkMediaSupport) {
        alert('Media devices support not available!');
        return;
    }

    startVideoCapture.disabled = model ? false : true;
    startVideoCapture.innerHTML = 'Loading Model ...';
    
    model = await tf.loadGraphModel('../../model/model.json', { onProgress: showProgress });
    is_new_model = model.inputs.length === 3;
    
    startVideoCapture.innerHTML = 'Start';
    startVideoCapture.disabled = model ? false : true;
    console.log(is_new_model ? "New Model Detected" : "Old Model Detected");
}

app();