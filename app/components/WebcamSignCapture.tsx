"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import WebcamCapture from "./WebcamCapture";
import { MdWavingHand } from "react-icons/md";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import Webcam from "react-webcam";
  



async function initHandLandmarker() 
{
    const fileset = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    return HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
            modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        },
        runningMode: "VIDEO",
        numHands: 2,
    });
}


const WebcamSignCapture = () => {

    const [isHoverCapture, setIsHoverCapture] = useState(false)
    const videoRef = useRef<Webcam>(null); // webcam element
    const handLandmarkerRef = useRef<HandLandmarker | null>(null); // AI instance

    useEffect(() => {
        initHandLandmarker().then((landmarker) => {
            handLandmarkerRef.current = landmarker;
        });
    }, []);

    requestAnimationFrame(function detectHands() 
    {
        if (
            videoRef.current &&
            videoRef.current.video &&
            handLandmarkerRef.current
        ) {
            const video = videoRef.current.video;
            const handLandmarker = handLandmarkerRef.current;
            const results = handLandmarker.detectForVideo(video, Date.now());
            // results has landmarks (21 points/vectors for hand 1), handedness (left/right), and handedness score

            // Process results (e.g., draw landmarks, recognize signs, etc.)
        }
        requestAnimationFrame(detectHands);
    });

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <WebcamCapture ref={videoRef} onMouseEntered={() => setIsHoverCapture(true)} onMouseLeft={() => setIsHoverCapture(false)} />
            <motion.div
                onMouseEnter={() => setIsHoverCapture(true)} 
                onMouseLeave={() => setIsHoverCapture(false)}
                className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10"
                initial={{ y: 100, opacity: 0 }}
                animate={isHoverCapture ? { y: 0, opacity: 1 } : { y: 100, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
                <button
                    className="bg-blue-300 text-black p-4 rounded-full shadow-lg cursor-pointer">
                    <MdWavingHand size={32} />
                </button>
            </motion.div>
        </div>
    )
}

export default WebcamSignCapture