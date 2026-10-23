# Student Name: Brunda Varshini Katapalli

# ==============================================================================================
# IMPORT LIBRARIES
# ==============================================================================================

'''
OpenCV (cv2) is used for:
1. Decoding base64 images sent from the React webcam into usable image arrays
2. Converting colour spaces (BGR to grayscale, BGR to RGB)
3. Resizing face crops to 160x160 for the CNN model
4. Head pose estimation using solvePnP
5. Haar Cascade face detection (fallback when dlib fails)
'''
import cv2

'''
dlib is used for:
1. Frontal face detection — more accurate than Haar Cascade
2. 68-point facial landmark detection
   Landmark regions:
   - Points 0–16   → Jawline
   - Points 17–21  → Left eyebrow
   - Points 22–26  → Right eyebrow
   - Points 27–35  → Nose bridge
   - Points 36–41  → Left eye
   - Points 42–47  → Right eye
   - Points 48–67  → Mouth
'''
import dlib

'''
NumPy is used for:
1. Fast array/vector maths (distances between landmark points)
2. Preparing image arrays for the CNN model
3. Computing argmax over CNN output probabilities
'''
import numpy as np

'''
base64 is used to decode the webcam image sent from the React frontend.
React captures video frames and encodes them as base64 JPEG strings before
sending them to this backend via HTTP POST.
'''
import base64

'''
TensorFlow / Keras is used to:
1. Load the pre-trained MobileNetV2 drowsiness classification model
2. Run inference (predict) on face crop images
3. Apply MobileNetV2-specific preprocessing to normalise pixel values
'''
import tensorflow as tf

'''
FastAPI is the web framework used to:
1. Create the REST API that the React frontend communicates with
2. Define the POST /predict endpoint that receives webcam frames
'''
from fastapi import FastAPI

'''
CORSMiddleware allows the React frontend (running on localhost or via ngrok)
to make requests to this backend without being blocked by browser CORS policy.
Without this, the browser would reject all cross-origin API calls.
'''
from fastapi.middleware.cors import CORSMiddleware

'''
BaseModel (from Pydantic) is used to define and validate the shape of
incoming request data. If the frontend sends wrong data, FastAPI
automatically returns a 422 error before our code even runs.
'''
from pydantic import BaseModel

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import uvicorn

# ==============================================================================================
# LOAD THE CNN MODEL — MobileNetV2
# ==============================================================================================

'''
We load the pre-trained MobileNetV2 model from a .keras file.
This model was trained to classify driver vigilance into three classes:
  Class 0 → Alert        (eyes open, attentive)
  Class 1 → Low Vigilant (early fatigue signs)
  Class 2 → Drowsy       (eyes closing, head nodding)

The model file must be in the same folder as this backend.py file.
In Google Colab, this file should be uploaded to your Drive vigidrive folder.
'''
model = tf.keras.models.load_model("MobileNetV2_fold0_best.keras")

# MobileNetV2 was trained on 160x160 pixel images.
# Every face crop we send to the model must be resized to this exact size.
IMG_SIZE = 160

'''
MobileNetV2 requires pixel values to be in the range [-1, 1].
The preprocess_input function converts standard 0–255 pixel values
into this normalised range automatically.
We store it as a variable so we can call it easily later.
'''
preprocess = tf.keras.applications.mobilenet_v2.preprocess_input

# Human-readable names for each output class index.
# Index 0 = Alert, Index 1 = Low Vigilant, Index 2 = Drowsy.
CLASS_NAMES = ["Alert", "Low Vigilant", "Drowsy"]


# ==============================================================================================
# LOAD FACE DETECTORS
# ==============================================================================================

'''
PRIMARY FACE DETECTOR — dlib Histogram of Oriented Gradients (HOG)
This detector uses a sliding window approach with a trained SVM classifier.
It is more accurate than Haar Cascade and produces fewer false positives.
We use this as the first attempt to find a face in each frame.
The second argument (0) means no upsampling — keeps processing fast.
'''
face_detector = dlib.get_frontal_face_detector()

'''
FACIAL LANDMARK PREDICTOR — dlib 68-point shape predictor
Once a face is found, this predictor locates 68 specific points on the face.
These points let us measure eye openness (EAR), mouth openness (MAR),
and estimate head rotation angles.

The .dat file is a pre-trained model file (~100MB).
It must be in the same folder as this backend.py.
Download from: http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2
'''
shape_predictor = dlib.shape_predictor("shape_predictor_68_face_landmarks.dat")

'''
FALLBACK FACE DETECTOR — OpenCV Haar Cascade
This is an older, faster but less accurate face detector.
It uses a cascade of simple rectangular feature classifiers.
We only use this when dlib's detector finds no faces.
OpenCV ships with this XML classifier file built-in, so no download needed.
'''
haar = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)


# ==============================================================================================
# FACIAL LANDMARK INDEX DEFINITIONS
# ==============================================================================================

# dlib 68-point landmark indices for the LEFT EYE.
# Point 36 = outer corner, 39 = inner corner.
# Points 37,38 = upper eyelid. Points 40,41 = lower eyelid.
LEFT_EYE = [36, 37, 38, 39, 40, 41]

# dlib 68-point landmark indices for the RIGHT EYE.
# Point 42 = inner corner, 45 = outer corner.
# Points 43,44 = upper eyelid. Points 46,47 = lower eyelid.
RIGHT_EYE = [42, 43, 44, 45, 46, 47]

# dlib 68-point landmark indices used for Mouth Aspect Ratio (MAR).
# These points cover the outer lip boundary.
# Point 48 = left corner, 54 = right corner.
# Points 50,51,52 = upper lip. Points 56,57,58 = lower lip.
MOUTH_IDX = [48, 50, 51, 52, 54, 56, 57, 58]


# ==============================================================================================
# FUNCTION: COMPUTE EYE ASPECT RATIO (EAR)
# ==============================================================================================

def compute_ear(pts, idx):
    """
    Computes the Eye Aspect Ratio (EAR) for one eye.

    EAR measures how open or closed an eye is at any given moment.
    It is calculated as the ratio of vertical eye height to horizontal eye width.

    Formula:
        EAR = (vertical_distance_1 + vertical_distance_2) / (2 × horizontal_distance)

    Interpretation:
        EAR ≈ 0.25–0.35  → Eyes fully open (normal alert state)
        EAR ≈ 0.15–0.20  → Eyes partially closed (low vigilance)
        EAR < 0.15       → Eyes closed (drowsy / blinking)

    Why divide by 2?
        We average two vertical measurements to make EAR more stable.
        A single vertical distance can be noisy if one landmark shifts.

    Parameters:
        pts  — list of all 68 landmark (x, y) tuples for the face
        idx  — list of 6 landmark indices for the eye (LEFT_EYE or RIGHT_EYE)

    Returns:
        float — the EAR value for this eye
    """

    # Extract the 6 landmark points for this eye as NumPy arrays.
    # This lets us use np.linalg.norm to compute Euclidean distances.
    p = [np.array(pts[i]) for i in idx]

    # VERTICAL DISTANCE 1: between upper eyelid point 1 and lower eyelid point 1
    # For left eye: between landmark 37 (upper) and landmark 41 (lower)
    a = np.linalg.norm(p[1] - p[5])

    # VERTICAL DISTANCE 2: between upper eyelid point 2 and lower eyelid point 2
    # For left eye: between landmark 38 (upper) and landmark 40 (lower)
    b = np.linalg.norm(p[2] - p[4])

    # HORIZONTAL DISTANCE: between the left and right corners of the eye
    # For left eye: between landmark 36 (outer) and landmark 39 (inner)
    c = np.linalg.norm(p[0] - p[3])

    # Apply the EAR formula. Guard against division by zero
    # (this can happen if face detection returns degenerate coordinates).
    if c > 0:
        ear = (a + b) / (2.0 * c)
    else:
        ear = 0.0

    return ear


# ==============================================================================================
# FUNCTION: COMPUTE MOUTH ASPECT RATIO (MAR)
# ==============================================================================================

def compute_mar(pts):
    """
    Computes the Mouth Aspect Ratio (MAR).

    MAR measures how open the mouth is. It follows the same principle as EAR —
    ratio of vertical opening to horizontal width — but applied to the mouth.

    Formula:
        MAR = (vertical_1 + vertical_2 + vertical_3) / (2 × horizontal_distance)

    We use three vertical measurements because the mouth is wider than the eye
    and a single vertical measurement would be too sensitive to lip asymmetry.

    Interpretation:
        MAR < 0.3   → Mouth closed (normal)
        MAR > 0.5   → Mouth noticeably open
        MAR > 0.6   → Likely yawning (sustained = fatigue indicator)

    Parameters:
        pts — list of all 68 landmark (x, y) tuples for the face

    Returns:
        float — the MAR value
    """

    # Extract the 8 mouth landmark points defined in MOUTH_IDX
    p = [np.array(pts[i]) for i in MOUTH_IDX]

    # THREE VERTICAL MOUTH DISTANCES
    # Measuring the opening height at three horizontal positions across the mouth.
    # p[1] vs p[7] = left-centre vertical pair
    a = np.linalg.norm(p[1] - p[7])

    # p[2] vs p[6] = centre vertical pair (widest opening usually here)
    b = np.linalg.norm(p[2] - p[6])

    # p[3] vs p[5] = right-centre vertical pair
    c = np.linalg.norm(p[3] - p[5])

    # HORIZONTAL MOUTH DISTANCE: left corner (48) to right corner (54)
    d = np.linalg.norm(p[0] - p[4])

    # Apply MAR formula. Guard against division by zero.
    if d > 0:
        mar = (a + b + c) / (2.0 * d)
    else:
        mar = 0.0

    return mar


# ==============================================================================================
# FUNCTION: COMPUTE HEAD PITCH ANGLE
# ==============================================================================================

def compute_pitch(pts, w, h):
    """
    Estimates the head pitch angle (up/down tilt) using the solvePnP algorithm.

    Pitch specifically measures forward head nodding — a common sign of microsleep.
    When a driver's head droops forward, pitch increases noticeably.

    How it works:
        1. We define 6 key facial points in a generic 3D face coordinate system.
        2. We find those same 6 points in the 2D webcam image (from dlib landmarks).
        3. OpenCV's solvePnP finds the rotation and translation that maps the
           3D model onto the 2D image — this gives us head orientation in 3D space.
        4. We convert the rotation vector to Euler angles and return the pitch.

    Interpretation:
        Pitch ≈ 0°        → Head upright (normal)
        Pitch > 15°       → Head tilting forward (drowsy / nodding off)
        Pitch > 25°       → Significant forward head drop (high drowsiness risk)

    Parameters:
        pts — list of all 68 landmark (x, y) tuples
        w   — frame width in pixels (used to estimate focal length)
        h   — frame height in pixels (used for camera centre estimate)

    Returns:
        float — pitch angle in degrees
    """

    # ── 3D REFERENCE FACE MODEL ──────────────────────────────────────────────
    # These are approximate 3D coordinates of facial landmarks on a
    # generic human face. Units are arbitrary but internally consistent.
    # We use the nose tip as the origin (0, 0, 0).
    model_points = np.array([
        (0,    0,    0   ),   # Nose tip      (landmark 30)
        (0,    -330, -65 ),   # Chin          (landmark 8)
        (-225, 170,  -135),   # Left eye corner  (landmark 36)
        (225,  170,  -135),   # Right eye corner (landmark 45)
        (-150, -150, -125),   # Left mouth corner  (landmark 48)
        (150,  -150, -125),   # Right mouth corner (landmark 54)
    ], dtype=np.float64)

    # ── CORRESPONDING 2D IMAGE POINTS ────────────────────────────────────────
    # The same 6 facial locations detected in the actual webcam frame.
    # solvePnP will find the transformation from model_points to image_points.
    image_points = np.array([
        pts[30],   # Nose tip
        pts[8],    # Chin
        pts[36],   # Left eye outer corner
        pts[45],   # Right eye outer corner
        pts[48],   # Left mouth corner
        pts[54],   # Right mouth corner
    ], dtype=np.float64)

    # ── CAMERA INTRINSIC MATRIX ───────────────────────────────────────────────
    # We approximate the webcam's focal length as equal to the frame width.
    # This is a reasonable estimate for most laptop/phone cameras.
    # The optical centre is assumed to be the image centre (w/2, h/2).
    focal = w
    cam   = np.array([
        [focal, 0,     w / 2],
        [0,     focal, h / 2],
        [0,     0,     1    ]
    ], dtype=np.float64)

    # Assume zero lens distortion (reasonable for modern webcams).
    dist = np.zeros((4, 1))

    # ── SOLVE HEAD POSE ───────────────────────────────────────────────────────
    # solvePnP returns:
    #   rvec — rotation vector (3D rotation of the head)
    #   tvec — translation vector (3D position, not used here)
    _, rvec, _ = cv2.solvePnP(model_points, image_points, cam, dist)

    # Convert the compact rotation vector (Rodrigues format) into
    # a full 3×3 rotation matrix so we can extract Euler angles.
    rmat, _ = cv2.Rodrigues(rvec)

    # Decompose the rotation matrix into Euler angles.
    # angles[0] = pitch (up/down tilt)
    # angles[1] = yaw   (left/right turn)
    # angles[2] = roll  (side-to-side lean)
    angles, *_ = cv2.RQDecomp3x3(rmat)

    # Return only the pitch angle (forward head nod detection)
    return float(angles[0])


# ==============================================================================================
# DECISION FUSION CLASS
# ==============================================================================================

class DecisionFusion:
    """
    Combines the CNN's class probabilities with EAR, MAR, and pitch signals
    to produce a more robust final drowsiness prediction.

    WHY DO WE NEED THIS?
    ─────────────────────
    A CNN trained on static images can be fooled by:
      - A single blurry frame where eyes look closed by accident
      - Poor lighting momentarily reducing confidence
      - An unusual head angle the model hasn't seen much of

    Decision Fusion solves this by:
      1. Tracking streaks — how many consecutive frames show closed eyes or yawning
      2. Escalating — promoting a Low Vigilant CNN prediction to Drowsy if the
         driver's eyes have been closed for a sustained number of frames
      3. Requiring persistence — only triggering an alert after Drowsy has been
         confirmed across 15 consecutive frames (prevents false alarms)

    This means a single odd frame won't trigger a false alert,
    but genuine sustained drowsiness will reliably be caught.
    """

    def __init__(self):
        # ── EYE CLOSURE STREAK ────────────────────────────────────────────────
        # Counts how many consecutive frames have had EAR < 0.20 (eyes closing).
        # Resets to 0 the moment eyes open again.
        # Used in escalation logic to catch sustained eye closure.
        self.ear_low_streak = 0

        # ── YAWN STREAK ───────────────────────────────────────────────────────
        # Counts how many consecutive frames have had MAR > 0.50 (mouth open).
        # Resets to 0 the moment mouth closes.
        # A yawn_event is fired after 90 consecutive frames of open mouth.
        self.mar_high_streak = 0

        # ── DROWSY STREAK ─────────────────────────────────────────────────────
        # Counts how many consecutive frames the final decision has been Drowsy.
        # Resets to 0 whenever the decision is Alert or Low Vigilant.
        # The alert is only triggered when this reaches 15 (prevents flickering).
        self.drowsy_streak = 0


    def step(self, probs, ear, mar, pitch):
        """
        Processes one frame's worth of signals and returns the final decision.

        Parameters:
            probs — list of 3 floats: [P(Alert), P(LowVigilant), P(Drowsy)]
                    These are the softmax probabilities from the CNN.
            ear   — float or None: average Eye Aspect Ratio for this frame
            mar   — float or None: Mouth Aspect Ratio for this frame
            pitch — float or None: head pitch angle in degrees

        Returns:
            dict with keys:
                final_label     — "Alert", "Low Vigilant", or "Drowsy"
                cnn_label       — what the CNN alone predicted (before fusion)
                confidence      — CNN's confidence score for its prediction
                escalated       — True if fusion upgraded Low Vigilant → Drowsy
                alert_triggered — True if drowsy streak has hit the alarm threshold
                yawn_event      — True if a sustained yawn was detected
                head_nod        — True if pitch angle suggests head drooping forward
        """

        # Convert the probability list to a NumPy array for easy argmax/indexing.
        probs = np.array(probs)

        # ── CNN PREDICTION ────────────────────────────────────────────────────
        # The class with the highest probability is the CNN's prediction.
        cnn_arg  = int(np.argmax(probs))   # 0, 1, or 2
        cnn_conf = float(probs[cnn_arg])   # confidence score 0.0 – 1.0

        # ── HANDLE MISSING VALUES ─────────────────────────────────────────────
        # If dlib found no face, EAR/MAR/pitch will be None.
        # We substitute safe neutral values so the fusion logic still runs
        # without throwing errors.
        ear_v   = ear   if ear   is not None else 1.0   # assume eyes open
        mar_v   = mar   if mar   is not None else 0.0   # assume mouth closed
        pitch_v = pitch if pitch is not None else 0.0   # assume head upright

        # ── UPDATE EYE CLOSURE STREAK ─────────────────────────────────────────
        # Increment the streak if eyes are closing, reset it if eyes are open.
        # Threshold of 0.20 means "eyes are significantly closed".
        if ear_v < 0.20:
            self.ear_low_streak += 1
        else:
            self.ear_low_streak = 0

        # ── UPDATE YAWN STREAK ────────────────────────────────────────────────
        # Increment the streak if mouth is open wide, reset if mouth is closed.
        # Threshold of 0.50 means "mouth is noticeably open".
        if mar_v > 0.50:
            self.mar_high_streak += 1
        else:
            self.mar_high_streak = 0

        # EAR/MAR-BASED DECISION (overrides CNN)
        # The CNN was trained on a specific in-car dataset and does not
        # generalise well to all webcam environments. We override it with
        # direct EAR/MAR threshold rules which are immediate and reliable.
        #
        # DROWSY:       avg EAR < 0.20  (eyes mostly closed)
        # LOW_VIGILANT: avg EAR < 0.27  OR MAR > 0.55 (yawning)
        # ALERT:        everything else
        escalated = False
        if ear_v < 0.20:
            decision  = 2   # DROWSY
            escalated = True
        elif ear_v < 0.27 or mar_v > 0.55:
            decision  = 1   # LOW VIGILANT
        else:
            decision  = cnn_arg  # trust CNN when eyes are clearly open

        # ── UPDATE DROWSY STREAK ──────────────────────────────────────────────
        # Track how many frames in a row the final decision has been Drowsy.
        # Any non-Drowsy frame immediately resets the streak to 0.
        if decision == 2:
            self.drowsy_streak += 1
        else:
            self.drowsy_streak = 0

        # ── ALERT TRIGGER ─────────────────────────────────────────────────────
        # Only fire the alert after 15 consecutive Drowsy frames (~7.5 seconds
        # at 2fps, which is our backend inference rate).
        # This prevents a single misclassified frame from falsely alarming.
        alert = self.drowsy_streak >= 15

        # ── RETURN FINAL RESULT ───────────────────────────────────────────────
        return {
            # The fused final prediction label sent to the frontend
            "final_label":     CLASS_NAMES[decision],

            # What the CNN alone predicted (useful for debugging/logging)
            "cnn_label":       CLASS_NAMES[cnn_arg],

            # CNN confidence for its prediction (0.0 – 1.0)
            "confidence":      round(cnn_conf, 4),

            # True if decision fusion upgraded the CNN prediction
            "escalated":       escalated,

            # True if the drowsy alarm should sound in the frontend
            "alert_triggered": bool(alert),

            # True if a sustained yawn was detected (90+ consecutive frames)
            "yawn_event":      bool(self.mar_high_streak >= 90),

            # True if head is drooping forward beyond the pitch threshold
            "head_nod":        bool(abs(pitch_v) > 15),
        }


# ==============================================================================================
# FASTAPI APPLICATION SETUP
# ==============================================================================================

# Create the FastAPI application instance.
# This is the object that handles all incoming HTTP requests.

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


fusion = DecisionFusion()

class FrameRequest(BaseModel):
    image: str

# ==============================================================================================
# POST /predict — MAIN INFERENCE ENDPOINT
# ==============================================================================================

@app.post("/predict")
async def predict(req: FrameRequest):
    """
    Receives a webcam frame from the React frontend, runs the full
    drowsiness detection pipeline, and returns the result.

    Pipeline:
        1. Decode base64 image → OpenCV image array
        2. Detect face (dlib → Haar fallback)
        3. Compute EAR, MAR, pitch from 68 facial landmarks
        4. Crop and preprocess face for the CNN
        5. Run MobileNetV2 inference → class probabilities
        6. Run DecisionFusion → final label + alert flags
        7. Return JSON result to frontend

    Called by: sendFrameToBackend() in App.jsx (MonitoringScreen)
    Frequency: ~2 times per second (throttled in the frontend)
    """

    # ── STEP 1: DECODE BASE64 IMAGE ───────────────────────────────────────────
    # The frontend sends the image as a base64 string with a data URL prefix
    # like "data:image/jpeg;base64,<actual_data>".
    # We split on "," and take the part after it, then decode to raw bytes.
    img_bytes = base64.b64decode(req.image.split(",")[-1])

    # Convert the raw bytes into a NumPy array so OpenCV can decode it.
    nparr = np.frombuffer(img_bytes, np.uint8)

    # Decode the NumPy byte array into a full BGR colour image.
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # If decoding failed (corrupted frame, wrong format), return an error.
    if frame is None:
        return {"error": "Could not decode image"}

    # Get frame dimensions for use in the camera matrix (pitch estimation).
    h, w = frame.shape[:2]

    # Convert to grayscale for dlib face detection.
    # dlib's HOG detector works on grayscale images only.
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Initialise EAR, MAR, pitch to None.
    # These stay None if no face is found (handled later in fusion).
    ear, mar, pitch_val, left_ear, right_ear = None, None, None, None, None

    # ── STEP 2: FACE DETECTION ────────────────────────────────────────────────
    # Try dlib's HOG face detector first (more accurate).
    # The second argument (0) = number of image upsampling passes (0 = none, fastest).
    faces = face_detector(gray, 0)

    # If dlib found no face, try Haar Cascade as a fallback.
    if len(faces) == 0:
        haar_faces = haar.detectMultiScale(gray, 1.1, 5)
        if len(haar_faces) > 0:
            # Haar returns (x, y, w, h) rectangles.
            # Convert to dlib rectangle format so the rest of the code is unified.
            x, y, fw, fh = haar_faces[0]
            faces = [dlib.rectangle(x, y, x + fw, y + fh)]

    # ── STEP 3: LANDMARKS + EAR/MAR/PITCH ────────────────────────────────────
    # Only run landmark detection if we found at least one face.
    if len(faces) > 0:
        face  = faces[0]   # Use the first (most prominent) face found

        # Run the 68-point shape predictor on the grayscale image.
        # 'shape' is a dlib full_object_detection containing 68 landmark points.
        shape = shape_predictor(gray, face)

        # Convert dlib landmarks to a plain Python list of (x, y) tuples.
        # This makes them easier to pass into our compute_ear/mar/pitch functions.
        pts = [(shape.part(i).x, shape.part(i).y) for i in range(68)]

        # Compute EAR for each eye independently so the frontend can display them separately.
        left_ear  = compute_ear(pts, LEFT_EYE)
        right_ear = compute_ear(pts, RIGHT_EYE)
        ear = (left_ear + right_ear) / 2.0  # averaged value used for fusion logic

        # Compute Mouth Aspect Ratio for yawn detection.
        mar = compute_mar(pts)

        # Compute head pitch angle for forward head nod detection.
        pitch_val = compute_pitch(pts, w, h)

    # ── STEP 4: PREPARE FACE CROP FOR CNN + REAL GRAD-CAM ──────────────────
    # gradcam_data holds real Grad-CAM heatmap points returned to the frontend.
    # It stays None if no face is detected or if Grad-CAM computation fails.
    gradcam_data = None

    if len(faces) > 0:
        face = faces[0]

        # Get the bounding box coordinates of the detected face.
        x1, y1 = face.left(),  face.top()
        x2, y2 = face.right(), face.bottom()

        # Clamp coordinates to stay within the image boundary.
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)

        face_w = x2 - x1
        face_h = y2 - y1

        # Crop the face region from the full frame.
        crop = frame[y1:y2, x1:x2]

        # Resize to 160x160 as required by MobileNetV2.
        crop_resized = cv2.resize(crop, (IMG_SIZE, IMG_SIZE))

        # Convert BGR to RGB.
        crop_rgb = cv2.cvtColor(crop_resized, cv2.COLOR_BGR2RGB)

        # Apply MobileNetV2 preprocessing: scales pixels from [0,255] to [-1,1].
        inp = preprocess(np.expand_dims(crop_rgb.astype(np.float32), 0))

        # Run inference.
        # probs is a list of 3 floats: [P(Alert), P(LowVigilant), P(Drowsy)]
        probs = model.predict(inp, verbose=0)[0].tolist()

        # ── REAL GRAD-CAM ──────────────────────────────────────────────────────────
        # Uses tf.GradientTape to compute gradients of the predicted class score
        # with respect to the last Conv2D layer activations.
        # High gradient x activation = region the model focused on most.
        try:
            # Find the last Conv2D layer across all layers and sub-models
            last_conv_name = None
            for layer in model.layers:
                if hasattr(layer, "layers"):
                    for sub in layer.layers:
                        if isinstance(sub, tf.keras.layers.Conv2D):
                            last_conv_name = sub.name
                elif isinstance(layer, tf.keras.layers.Conv2D):
                    last_conv_name = layer.name

            # Build a model that outputs last conv activations + final predictions
            grad_model = tf.keras.models.Model(
                inputs=model.inputs,
                outputs=[model.get_layer(last_conv_name).output, model.output]
            )

            inp_tensor = tf.cast(inp, tf.float32)

            with tf.GradientTape() as tape:
                tape.watch(inp_tensor)
                conv_outputs, predictions = grad_model(inp_tensor)
                pred_class  = tf.argmax(predictions[0])
                class_score = predictions[:, pred_class]

            # Gradients of the class score w.r.t. last conv activations
            grads = tape.gradient(class_score, conv_outputs)

            # Global average pool to get per-channel importance weights
            pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2)).numpy()

            # Weight each channel of the conv output map by its importance
            conv_out = conv_outputs[0].numpy()
            for i in range(pooled_grads.shape[-1]):
                conv_out[:, :, i] *= pooled_grads[i]

            # Average across channels to produce the 2D heatmap
            heatmap = np.mean(conv_out, axis=-1)

            # ReLU: discard negative values (not relevant to this class)
            heatmap = np.maximum(heatmap, 0)

            # Normalise to 0-1
            if heatmap.max() > 0:
                heatmap = heatmap / heatmap.max()

            # Resize heatmap to match the face bounding box in the original frame
            heatmap_resized = cv2.resize(heatmap, (face_w, face_h))

            # Convert to sparse {x%, y%, intensity} points for the frontend
            # Sample every 4th pixel to keep the JSON payload small
            points = []
            step = 4
            for row in range(0, face_h, step):
                for col in range(0, face_w, step):
                    intensity = float(heatmap_resized[row, col])
                    if intensity > 0.1:
                        px = round((x1 + col) / w * 100, 2)
                        py = round((y1 + row) / h * 100, 2)
                        points.append({"x": px, "y": py, "v": round(intensity, 3)})

            gradcam_data = {
                "points":      points,
                "face_x1_pct": round(x1 / w * 100, 2),
                "face_y1_pct": round(y1 / h * 100, 2),
                "face_w_pct":  round(face_w / w * 100, 2),
                "face_h_pct":  round(face_h / h * 100, 2),
            }

        except Exception as e:
            # Grad-CAM failed silently; frontend falls back to no overlay
            print(f"Grad-CAM error: {e}")
            gradcam_data = None

    else:
        # No face detected — default to maximum Alert probability.
        # Prevents false drowsiness alarms when camera is obstructed.
        probs = [1.0, 0.0, 0.0]

    # ── STEP 5: DECISION FUSION ─────────────────────────────────────────────
    # Pass all signals to the fusion engine to get the final prediction.
    # The fusion instance is global, so streak counters persist across frames.
    result = fusion.step(probs, ear, mar, pitch_val)

    # ── STEP 6: RETURN JSON RESPONSE ────────────────────────────────────────
    # gradcam is included so the frontend can render the real heatmap overlay.
    return {
        **result,
        "left_ear":  round(left_ear,   3) if ear       is not None else None,
        "right_ear": round(right_ear,  3) if ear       is not None else None,
        "ear":       round(ear,        3) if ear       is not None else None,
        "mar":       round(mar,        3) if mar       is not None else None,
        "pitch":     round(pitch_val,  1) if pitch_val is not None else None,
        "gradcam":   gradcam_data,
    }

