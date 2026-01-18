"use client"
import Webcam from "react-webcam";


interface WebcamCaptureProps {
    onMouseEntered?: () => void
    onMouseLeft?: () => void
    ref?: React.Ref<Webcam>
}

const WebcamCapture = ({ onMouseEntered, onMouseLeft, ref }: WebcamCaptureProps) => {
    const constraints = {
        facingMode: "user"
    };


    return (
        
    <Webcam 
        ref={ref}
        className="h-screen w-screen"
        audio = {false}
        videoConstraints = {constraints}
        onMouseEnter={onMouseEntered}
        onMouseLeave={onMouseLeft}
    />
  )
}

export default WebcamCapture