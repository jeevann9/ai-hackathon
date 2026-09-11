"use client";

import { useEffect, useRef, useState } from "react";
import {
  FaceDetector,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

type Props = {
  answer: string;
  setAnswer: React.Dispatch<React.SetStateAction<string>>;
  question: string;
};

export default function InterviewMedia({
  answer,
  setAnswer,
  question,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const recognitionRef = useRef<any>(null);

  const faceDetectorRef = useRef<FaceDetector | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [faceStatus, setFaceStatus] = useState<
    "checking" | "good" | "none" | "multiple" | "outside"
  >("checking");

  const [faceDetectorReady, setFaceDetectorReady] = useState(false);

  // =========================================================
  // INITIALIZE FACE DETECTOR
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    const initializeFaceDetector = async () => {
      try {
        console.log("Loading MediaPipe face detector...");

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm"
        );

        console.log("MediaPipe WASM loaded.");

        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "/models/blaze_face_short_range.tflite",
          },

          runningMode: "VIDEO",

          minDetectionConfidence: 0.5,
        });

        if (cancelled) {
          detector.close();
          return;
        }

        faceDetectorRef.current = detector;

        setFaceDetectorReady(true);

        console.log("Face detector ready.");
      } catch (error) {
        console.log("Face detector could not be loaded.");

        if (error instanceof Error) {
          console.log("Face detector error:", error.message);
        } else {
          console.log("Face detector error:", error);
        }

        setFaceDetectorReady(false);
      }
    };

    initializeFaceDetector();

    return () => {
      cancelled = true;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      faceDetectorRef.current?.close();
      faceDetectorRef.current = null;
    };
  }, []);

  // =========================================================
  // FACE DETECTION
  // =========================================================

  const detectFaces = () => {
    const video = videoRef.current;
    const detector = faceDetectorRef.current;

    if (!video || !detector) {
      return;
    }

    if (!cameraOn) {
      return;
    }

    if (video.readyState < 2) {
      animationFrameRef.current =
        requestAnimationFrame(detectFaces);

      return;
    }

    try {
      const result = detector.detectForVideo(
        video,
        performance.now()
      );

      const faces = result.detections;

      // -----------------------------------------------------
      // NO FACE
      // -----------------------------------------------------

      if (faces.length === 0) {
        setFaceStatus("none");
      }

      // -----------------------------------------------------
      // MULTIPLE PEOPLE
      // -----------------------------------------------------

      else if (faces.length > 1) {
        setFaceStatus("multiple");
      }

      // -----------------------------------------------------
      // EXACTLY ONE FACE
      // -----------------------------------------------------

      else {
        const face = faces[0];

        const box = face.boundingBox;

        if (!box) {
          setFaceStatus("outside");
        } else {
          const videoWidth = video.videoWidth;
          const videoHeight = video.videoHeight;

          if (videoWidth === 0 || videoHeight === 0) {
            setFaceStatus("checking");

            animationFrameRef.current =
              requestAnimationFrame(detectFaces);

            return;
          }

          // -------------------------------------------------
          // HIGHLIGHT BOX
          // These values roughly match the visual box.
          // -------------------------------------------------

          const boxLeft = videoWidth * 0.30;
          const boxRight = videoWidth * 0.70;

          const boxTop = videoHeight * 0.15;
          const boxBottom = videoHeight * 0.85;

          // Face center
          const faceCenterX =
            box.originX + box.width / 2;

          const faceCenterY =
            box.originY + box.height / 2;

          const insideBox =
            faceCenterX >= boxLeft &&
            faceCenterX <= boxRight &&
            faceCenterY >= boxTop &&
            faceCenterY <= boxBottom;

          if (insideBox) {
            setFaceStatus("good");
          } else {
            setFaceStatus("outside");
          }
        }
      }
    } catch (error) {
      console.log("Face detection error:", error);
    }

    animationFrameRef.current =
      requestAnimationFrame(detectFaces);
  };

  // =========================================================
  // START / STOP FACE DETECTION WHEN CAMERA CHANGES
  // =========================================================

  useEffect(() => {
    if (!cameraOn) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      return;
    }

    if (!faceDetectorReady) {
      return;
    }

    setFaceStatus("checking");

    animationFrameRef.current =
      requestAnimationFrame(detectFaces);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [cameraOn, faceDetectorReady]);

  // =========================================================
  // CAMERA
  // =========================================================

  const toggleCamera = async () => {
    // -------------------------------------------------------
    // TURN CAMERA OFF
    // -------------------------------------------------------

    if (cameraOn) {
      streamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setFaceStatus("checking");
      setCameraOn(false);

      return;
    }

    // -------------------------------------------------------
    // TURN CAMERA ON
    // -------------------------------------------------------

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert(
          "Camera access is not supported by this browser."
        );

        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",

            width: {
              ideal: 1280,
            },

            height: {
              ideal: 720,
            },
          },

          audio: false,
        });

      console.log("Camera stream received.");

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        try {
          await videoRef.current.play();
        } catch (error) {
          console.log("Video play error:", error);
        }
      }

      setCameraOn(true);
      setFaceStatus("checking");
    } catch (error) {
      console.log("Camera error:", error);

      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          alert(
            "Camera permission was denied. Please allow camera access in your browser."
          );
        } else if (error.name === "NotFoundError") {
          alert("No camera was found on this device.");
        } else if (error.name === "NotReadableError") {
          alert(
            "The camera is being used by another application. Close Camera, Teams, Zoom, etc."
          );
        } else {
          alert(`Camera error: ${error.name}`);
        }
      } else {
        alert("Unable to access the camera.");
      }
    }
  };

  // =========================================================
  // MICROPHONE / SPEECH TO TEXT
  // =========================================================

  const toggleMic = () => {
    if (micOn) {
      recognitionRef.current?.stop();

      recognitionRef.current = null;

      setMicOn(false);

      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Speech recognition is not supported in this browser."
      );

      return;
    }

    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event: any) => {
      let finalText = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        if (event.results[i].isFinal) {
          finalText +=
            event.results[i][0].transcript + " ";
        }
      }

      if (finalText.trim()) {
        setAnswer((previous) =>
          previous
            ? `${previous} ${finalText.trim()}`
            : finalText.trim()
        );
      }
    };

    recognition.onerror = (event: any) => {
      console.log(
        "Speech recognition error:",
        event.error
      );

      if (event.error === "network") {
        alert(
          "Browser speech recognition is unavailable. Please type your answer or try the microphone again."
        );
      } else if (event.error === "not-allowed") {
        alert(
          "Please allow microphone access."
        );
      }

      setMicOn(false);
    };

    recognition.onend = () => {
      setMicOn(false);
    };

    recognitionRef.current = recognition;

    recognition.start();

    setMicOn(true);
  };

  // =========================================================
  // READ QUESTION
  // =========================================================

  const readQuestion = () => {
    if (!question) {
      return;
    }

    window.speechSynthesis.cancel();

    const speech =
      new SpeechSynthesisUtterance(question);

    speech.lang = "en-IN";

    speech.rate = 0.9;

    speech.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    speech.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    speech.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(speech);
  };

  // =========================================================
  // PAUSE / RESUME QUESTION
  // =========================================================

  const toggleQuestionPause = () => {
    if (!window.speechSynthesis.speaking) {
      return;
    }

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();

      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();

      setIsPaused(true);
    }
  };

  // =========================================================
  // STOP QUESTION
  // =========================================================

  const stopQuestion = () => {
    window.speechSynthesis.cancel();

    setIsSpeaking(false);
    setIsPaused(false);
  };

  // =========================================================
  // CLEANUP
  // =========================================================

  useEffect(() => {
    return () => {
      streamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());

      recognitionRef.current?.stop();

      if (animationFrameRef.current) {
        cancelAnimationFrame(
          animationFrameRef.current
        );
      }

      window.speechSynthesis.cancel();

      faceDetectorRef.current?.close();
    };
  }, []);

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="mt-6 space-y-5">

      {/* ===================================================
          CAMERA PREVIEW
      =================================================== */}

      <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700 bg-black shadow-2xl">

        {/* VIDEO */}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={() => {
            if (videoRef.current) {
              videoRef.current
                .play()
                .catch((error) =>
                  console.log(
                    "Video play error:",
                    error
                  )
                );
            }
          }}
          className={`h-[420px] w-full object-cover ${
            cameraOn ? "block" : "hidden"
          }`}
        />

        {/* CAMERA OFF */}

        {!cameraOn && (
          <div className="flex h-[420px] items-center justify-center">

            <div className="text-center">

              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 text-4xl">
                📷
              </div>

              <p className="text-lg font-semibold text-white">
                Camera Preview
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Turn on your camera to start the interview
              </p>

            </div>

          </div>
        )}

        {/* CAMERA ON */}

        {cameraOn && (
          <>
            {/* DARK OVERLAY */}

            <div className="pointer-events-none absolute inset-0 bg-black/10" />

            {/* FACE ALIGNMENT */}

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">

              <div className="relative h-72 w-60">

                {/* FACE BOX */}

                <div
                  className={`absolute inset-0 rounded-3xl border-4 transition-all duration-300 ${
                    faceStatus === "good"
                      ? "border-green-400 shadow-[0_0_25px_rgba(74,222,128,0.8)]"
                      : faceStatus === "checking"
                      ? "border-blue-400 shadow-[0_0_25px_rgba(96,165,250,0.8)]"
                      : "border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.9)]"
                  }`}
                />

                {/* TOP LEFT */}

                <div className="absolute -left-1 -top-1 h-10 w-10 rounded-tl-2xl border-l-4 border-t-4 border-white" />

                {/* TOP RIGHT */}

                <div className="absolute -right-1 -top-1 h-10 w-10 rounded-tr-2xl border-r-4 border-t-4 border-white" />

                {/* BOTTOM LEFT */}

                <div className="absolute -bottom-1 -left-1 h-10 w-10 rounded-bl-2xl border-b-4 border-l-4 border-white" />

                {/* BOTTOM RIGHT */}

                <div className="absolute -bottom-1 -right-1 h-10 w-10 rounded-br-2xl border-b-4 border-r-4 border-white" />

                {/* LABEL */}

                <div
                  className={`absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-white backdrop-blur ${
                    faceStatus === "good"
                      ? "bg-green-600/80"
                      : "bg-red-600/80"
                  }`}
                >
                  {faceStatus === "good"
                    ? "✓ Face aligned"
                    : faceStatus === "none"
                    ? "⚠ No face detected"
                    : faceStatus === "multiple"
                    ? "⚠ Only one person allowed"
                    : faceStatus === "outside"
                    ? "⚠ Move your face inside the box"
                    : "🔍 Detecting face..."}
                </div>

              </div>

            </div>

            {/* CAMERA STATUS */}

            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 text-xs font-medium text-white backdrop-blur">

              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />

              CAMERA ON

            </div>

          </>
        )}

      </div>

      {/* ===================================================
          FACE STATUS
      =================================================== */}

      {cameraOn && (
        <div
          className={`mx-auto max-w-xl rounded-xl border p-3 text-center text-sm font-medium ${
            faceStatus === "good"
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {faceStatus === "good" &&
            "✓ Face detected and properly aligned"}

          {faceStatus === "none" &&
            "⚠ No face detected"}

          {faceStatus === "multiple" &&
            "⚠ Multiple people detected. Only one person should be visible."}

          {faceStatus === "outside" &&
            "⚠ Please move your face inside the highlighted box."}

          {faceStatus === "checking" &&
            (!faceDetectorReady
              ? "🔍 Loading face detection..."
              : "🔍 Checking your face...")}
        </div>
      )}

      {/* ===================================================
          CONTROLS
      =================================================== */}

      <div className="flex flex-wrap justify-center gap-3">

        {/* CAMERA */}

        <button
          onClick={toggleCamera}
          className={`rounded-xl px-5 py-3 font-medium transition ${
            cameraOn
              ? "bg-red-600 hover:bg-red-500"
              : "bg-blue-600 hover:bg-blue-500"
          }`}
        >
          {cameraOn
            ? "📷 Turn Camera Off"
            : "📷 Turn Camera On"}
        </button>

        {/* MICROPHONE */}

        <button
          onClick={toggleMic}
          className={`rounded-xl px-5 py-3 font-medium transition ${
            micOn
              ? "bg-red-600 hover:bg-red-500"
              : "bg-emerald-600 hover:bg-emerald-500"
          }`}
        >
          {micOn
            ? "🎤 Stop Speaking"
            : "🎤 Answer with Voice"}
        </button>

        {/* READ QUESTION */}

        <button
          onClick={readQuestion}
          className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 font-medium text-white transition hover:bg-slate-700"
        >
          🔊 Read Question
        </button>

        {/* PAUSE / RESUME */}

        {isSpeaking && (
          <>
            <button
              onClick={toggleQuestionPause}
              className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-3 font-medium text-yellow-300 transition hover:bg-yellow-500/20"
            >
              {isPaused
                ? "▶️ Resume Question"
                : "⏸ Pause Question"}
            </button>

            {/* STOP */}

            <button
              onClick={stopQuestion}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 font-medium text-red-300 transition hover:bg-red-500/20"
            >
              ⏹ Stop
            </button>
          </>
        )}

      </div>

      {/* ===================================================
          VOICE STATUS
      =================================================== */}

      {micOn && (
        <div className="mx-auto max-w-xl rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm text-emerald-300">
          🎤 Listening... Speak your answer clearly.
        </div>
      )}

    </div>
  );
}