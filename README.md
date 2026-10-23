# VigiDrive: Driver Fatigue Detection System
**Project By: Brunda Varshini Katapali (group of 3 members)**

A real-time driver alertness monitor built for a Deep Learning and CNN course. It reads a webcam feed and classifies the driver as **Alert**, **Low Vigilant** or **Drowsy**, then shows live alerts and an end-of-session summary.

> **Student project.** This is a prototype for learning and demonstration. It is not a safety product and must not be relied on while driving.

## How it Works

- **Classifier:** a MobileNetV2 CNN (transfer learning, trained on the D3S dataset with leave-one-subject-out evaluation). EfficientNetB0 and ResNet50V2 were compared in the report.
- **Facial features:** dlib's 68-point landmarks give the Eye Aspect Ratio (EAR), Mouth Aspect Ratio (MAR) and head pose for every frame.
- **Decision fusion:** rules combine the CNN output with EAR, MAR and head pose to escalate ambiguous predictions towards safety.
- **Explainability:** an optional Grad-CAM heatmap shows where the model is looking.
- **App:** a React frontend sends webcam frames to a FastAPI backend (`POST /predict`) and displays the result.

The full report (method, results and limitations) is in this repository.

## Repository Layout

```
src/App.jsx        React frontend (all screens)
src/backend.py     FastAPI inference server
public/            static files
package.json       frontend dependencies
```

## What is not Included?

| File | Why | Where to get it |
|---|---|---|
| `MobileNetV2_fold0_best.keras` | Trained model weights (about 26 MB, too large for the repo) | Download it from the [Releases](../../releases) page and put it next to `backend.py` |
| `shape_predictor_68_face_landmarks.dat` | dlib model, separate licence | Download from http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2 and unzip |
| D3S dataset | Belongs to its authors, not redistributed here | https://github.com/bindujiit/Driver-Drowsiness-Dataset-D3S- |

Put both model files next to `backend.py`.

## Run it

### 1. Backend

Requires Python 3.9 to 3.11. `dlib` needs a C++ build toolchain (CMake and Visual Studio Build Tools on Windows). If it will not install locally, run the backend in Google Colab instead (see below).

```bash
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install fastapi uvicorn tensorflow dlib opencv-python-headless numpy pydantic
cd src
uvicorn backend:app --host 0.0.0.0 --port 8000
```

### 2. Frontend

```bash
npm install
```

Tell the app where the backend is by creating a file named `.env.local` in the project root:

```
REACT_APP_BACKEND_URL=http://localhost:8000
```

Then start it:

```bash
npm start
```

The app opens at http://localhost:3000. Allow camera access when asked.

### Running the Backend in Google Colab

The original demo ran the backend in Colab and exposed it with an [ngrok](https://ngrok.com) tunnel, because dlib and TensorFlow were hard to install on a Windows laptop. If you do the same, put your own ngrok URL in `.env.local` as `REACT_APP_BACKEND_URL`. Never commit your ngrok token or URL.

## Team Contribution

This was a group project. I (Brunda Varshini Katapalli) built the **React frontend** (all screens, camera handling, live monitoring and the session summary), the **FastAPI backend** (landmark features, decision fusion, Grad-CAM and the `/predict` endpoint), the Colab and ngrok deployment, and the system flowchart. My teammates built the dataset pipeline and trained and evaluated the CNN models. The report describes each part.

## Credits

- **Dataset:** the **D3S (Driver Drowsiness Detection Dataset)**, published at https://github.com/bindujiit/Driver-Drowsiness-Dataset-D3S-. It contains facial images of three subjects across neutral, happy, eyes-closed and yawn states. The dataset belongs to its authors and is not included in this repository. Please read its page for terms of use. The face images shown in the report's augmentation figure come from this dataset.
- **Face landmarks:** [dlib](http://dlib.net) and its 68-point shape predictor.
- **Pretrained backbones:** MobileNetV2, EfficientNetB0 and ResNet50V2 with ImageNet weights, via Keras.
- **Face tracking in the browser:** [MediaPipe](https://developers.google.com/mediapipe).

## Notes and Limitations

- The login screen is a demo only. There is no real authentication, and the sample account in `App.jsx` is a placeholder.
- The backend allows requests from any origin (`allow_origins=["*"]`) for demo convenience. Restrict it before any real deployment.
- Frames travel to the backend and back, so over a tunnel there is roughly 0.5 to 1 second of delay.
- The email report is implemented at the interface level only.
- The model was trained on three subjects, so it should not be expected to generalise to everyone. See the report for the safety versus accuracy discussion.
