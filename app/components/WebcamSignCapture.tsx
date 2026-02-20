"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WebcamCapture from "./WebcamCapture";
import { MdWavingHand, MdHelpOutline, MdClose } from "react-icons/md";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import Webcam from "react-webcam";
import Image from "next/image";
import determineFeatures, { letterDetected } from "../CoreLogic/DetermineFeatures";

async function initHandLandmarker() {
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
    const [isHoverCapture, setIsHoverCapture] = useState(false);
    const [isButtonClicked, setIsButtonClicked] = useState(false);
    const [showReference, setShowReference] = useState(true);
    const [isClient, setIsClient] = useState(false);
    
    const videoRef = useRef<Webcam>(null);
    const handLandmarkerRef = useRef<HandLandmarker | null>(null);

    const [alphabeticalLetterDetected, setAlphabeticalLetterDetected] = useState<string>("");
    const [displayCurrentLetter, setDisplayCurrentLetter] = useState<string>("");
    const [currentHandPos, setCurrentHandPos] = useState<{ x: number; y: number } | null>(null);

    useEffect(() => {
        setIsClient(true);
        initHandLandmarker()
            .then((landmarker) => {
                handLandmarkerRef.current = landmarker;
            })
            .catch((err) => {
                console.error("HandLandmarker init error:", err);
            });
    }, []);

    const handleButtonClick = () => {
        if (alphabeticalLetterDetected !== "" && currentHandPos) {
            setDisplayCurrentLetter(alphabeticalLetterDetected);
            setTimeout(() => {
                setDisplayCurrentLetter("");
            }, 5000);
        }
        setIsButtonClicked(true);
        setTimeout(() => setIsButtonClicked(false), 300);
    };

    useEffect(() => {
        if (!isClient) return;

        let animationFrameId: number;

        const detectHands = () => {
            if (
                videoRef.current &&
                videoRef.current.video &&
                handLandmarkerRef.current
            ) {
                const video = videoRef.current.video;
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                    try {
                        const results = handLandmarkerRef.current.detectForVideo(video, Date.now());
                        
                        if (results.landmarks && results.landmarks.length > 0) {
                            const features = determineFeatures(results);
                            const detectedLetter = letterDetected(features);

                            if (detectedLetter !== "") {
                                setAlphabeticalLetterDetected(detectedLetter);
                            }

                            if (features.landmarks[0]) {
                                setCurrentHandPos({ x: features.landmarks[0].x, y: features.landmarks[0].y });
                            }
                        } else {
                            setCurrentHandPos(null);
                        }
                    } catch (error) {
                        console.error("Detection error:", error);
                    }
                }
            }
            animationFrameId = requestAnimationFrame(detectHands);
        };

        animationFrameId = requestAnimationFrame(detectHands);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isClient]);

    if (!isClient) {
        return <div className="h-screen w-screen bg-neutral-900" />;
    }

    return (
        <div className="relative w-full h-full flex items-center justify-center bg-black">
            <div className="relative w-full h-full">
                <WebcamCapture 
                    ref={videoRef} 
                    onMouseEntered={() => setIsHoverCapture(true)} 
                    onMouseLeft={() => setIsHoverCapture(false)} 
                />
                
                {displayCurrentLetter && currentHandPos && (
                    <div 
                        className="absolute px-4 py-2 bg-blue-500 text-white rounded-lg font-bold text-2xl shadow-lg pointer-events-none z-30"
                        style={{
                            left: `${currentHandPos.x * 100}%`,
                            top: `${currentHandPos.y * 100}%`,
                            transform: 'translate(-50%, -120%)',
                        }}
                    >
                        {displayCurrentLetter}
                    </div>
                )}
            </div>

            <div className="absolute top-6 right-6 z-40">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowReference(!showReference)}
                    className="bg-white/20 backdrop-blur-md border border-white/30 p-3 rounded-full shadow-lg text-white hover:bg-white/30 transition-colors"
                >
                    {showReference ? <MdClose size={24} /> : <MdHelpOutline size={24} />}
                </motion.button>
            </div>

            <AnimatePresence>
                {showReference && (
                    <motion.div
                        initial={{ opacity: 0, x: 100, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 100, scale: 0.8 }}
                        className="absolute top-20 right-6 z-40 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl max-w-sm w-full"
                    >
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <MdHelpOutline />
                                ASL Reference
                            </h3>
                        </div>
                        <div className="relative bg-white/5 p-2">
                            <Image 
                                src="/asl-reference.png" 
                                alt="ASL Reference" 
                                width={400} 
                                height={600}
                                className="w-full h-auto rounded-lg"
                                priority
                            />
                        </div>
                        <div className="p-3 bg-white/5 text-xs text-white/60 text-center">
                            Hand shapes for letters A through J.
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                onMouseEnter={() => setIsHoverCapture(true)} 
                onMouseLeave={() => setIsHoverCapture(false)}
                className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-40"
                initial={{ y: 100, opacity: 0 }}
                animate={isHoverCapture ? { y: 0, opacity: 1 } : { y: 100, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
                <motion.button
                    onClick={handleButtonClick}
                    animate={{ scale: isButtonClicked ? 1.2 : 1 }}
                    className="bg-blue-500 text-white p-6 rounded-full shadow-2xl cursor-pointer hover:bg-blue-600 border-2 border-white/30"
                >
                    <MdWavingHand size={32} />
                </motion.button>
            </motion.div>
        </div>
    );
};

export default WebcamSignCapture;
