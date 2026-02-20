"use client"
import { forwardRef } from "react";
import Webcam from "react-webcam";

interface WebcamCaptureProps {
    onMouseEntered?: () => void;
    onMouseLeft?: () => void;
}

const WebcamCapture = forwardRef<Webcam, WebcamCaptureProps>(({ onMouseEntered, onMouseLeft }, ref) => {
    const constraints = {
        facingMode: "user"
    };

    return (
        <Webcam 
            ref={ref}
            className="h-screen w-screen"
            audio={false}
            videoConstraints={constraints}
            onMouseEnter={onMouseEntered}
            onMouseLeave={onMouseLeft}
        />
    );
});

WebcamCapture.displayName = "WebcamCapture";

export default WebcamCapture;
