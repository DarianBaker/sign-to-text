import { HandLandmarkerResult } from "@mediapipe/tasks-vision";

export default function determineFeatures(input: HandLandmarkerResult): Features 
{




    // Placeholder logic for determining features from input
    return {
        handedness: 'right', // for now..
        landmarks: [],
        jointAngles: {},
        relativeDistances: {},
        handOrientation: { palmNormalVector: { x: 0, y: 0, z: 0 } },
    };
}

export interface Features {
    handedness: 'Left' | 'Right';
    landmarks: Array<{ x: number; y: number; z: number }>;
    jointAngles: Record<string, number>;
    relativeDistances: Record<string, number>;
    handOrientation: { palmNormalVector: { x: number; y: number; z: number } };
}

function isLetterA(features: Features): boolean 
{
    if (features.landmarks.length === 21)
    {
        // features.landmarks[0].y; // wrist
        // features.landmarks[4].y; // thumb tip
        features.landmarks[6].y // pip.y smaller then dip,y and smaller then mcp.y
        


        // features.landmarks[8].y; // index tip
        // features.landmarks[12].y; // middle tip
        // features.landmarks[16].y; // ring tip
        // features.landmarks[20].y; // pinky tip
    }
    return false;
}