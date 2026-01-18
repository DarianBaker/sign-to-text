import { HandLandmarkerResult, Landmark } from "@mediapipe/tasks-vision";
import { angleBetween, cross, distance, normalize, vector } from "./Helpers";

export interface Features {
  handedness: 'Left' | 'Right';
  landmarks: Array<{ x: number; y: number; z: number }>;
  jointAngles: Record<string, number>; // in degrees
  relativeDistances: Record<string, number>; // normalized units
  handOrientation: { palmNormalVector: { x: number; y: number; z: number } };
}

export default function determineFeatures(input: HandLandmarkerResult): Features {
  const landmarks = input.landmarks[0]; // first hand
  const handedness = input.handedness[0][0].categoryName as 'Left' | 'Right';


  // --- Joint angles ---
  const jointAngles: Record<string, number> = {};

  const fingers = {
    thumb: [1, 2, 3, 4],
    index: [5, 6, 7, 8],
    middle: [9, 10, 11, 12],
    ring: [13, 14, 15, 16],
    pinky: [17, 18, 19, 20],
  };

  for (const fingerName in fingers) {
    const indices = fingers[fingerName as keyof typeof fingers];
    // angle between base→middle and middle→tip
    const v1 = vector(landmarks[indices[0]], landmarks[indices[1]]);
    const v2 = vector(landmarks[indices[1]], landmarks[indices[2]]);
    const v3 = vector(landmarks[indices[2]], landmarks[indices[3]]);
    jointAngles[`${fingerName}_base`] = angleBetween(v1, v2);
    jointAngles[`${fingerName}_tip`] = angleBetween(v2, v3);
  }

  // --- Relative distances ---
  const relativeDistances: Record<string, number> = {};
  relativeDistances['thumb_index'] = distance(landmarks[4], landmarks[8]);
  relativeDistances['index_middle'] = distance(landmarks[8], landmarks[12]);
  relativeDistances['middle_ring'] = distance(landmarks[12], landmarks[16]);
  relativeDistances['ring_pinky'] = distance(landmarks[16], landmarks[20]);
  relativeDistances['wrist_middle'] = distance(landmarks[0], landmarks[12]);

  // --- Hand orientation (palm normal) ---
  const v1 = vector(landmarks[0], landmarks[5]);  // wrist -> index MCP
  const v2 = vector(landmarks[0], landmarks[17]); // wrist -> pinky MCP
  const palmNormal = normalize(cross(v1, v2));

  const handOrientation = { palmNormalVector: palmNormal };

  return {
    handedness,
    landmarks,
    jointAngles,
    relativeDistances,
    handOrientation,
  };
}

export function isLetterA(features: Features): boolean
 {
    if (features.landmarks.length !== 21) return false;

    const landmarks = features.landmarks;
    const wrist = landmarks[0];

   
    // Ensure palm is facing camera .. z should be negative
    if (features.handOrientation.palmNormalVector.z > 0.1) return false;

    //Distinguish from 'C' using joint angles (A is a tight fist, C is a curve)
    const angles = [
        features.jointAngles.index_base,
        features.jointAngles.middle_base,
        features.jointAngles.ring_base,
        features.jointAngles.pinky_base
    ];
    // In 'A' these angles are sharp (usually > 90*) In 'C' they are shallow...
    if (angles.some(angle => angle < 80)) return false;
    // These must be curled into the palm.


    const fingerTips = [8, 12, 16, 20];
    const fingerPips = [6, 10, 14, 18]; // PIP is usually better for "curled" checks than MCP

    for (let i = 0; i < fingerTips.length; i++) {
        const tipIndex = fingerTips[i];
        const pipIndex = fingerPips[i];

        const distTipToWrist = distance(landmarks[tipIndex], wrist);
        const distPipToWrist = distance(landmarks[pipIndex], wrist);

        // If the tip is further from the wrist than the PIP joint, the finger is OPEN.
        // For 'A', we want them CLOSED, so if Tip > PIP, it's not an A.
        if (distTipToWrist > distPipToWrist) {
            return false; 
        }
    }

    // For ASL 'A' the thumb stands upright against the side of the hand.
    // It should be EXTENDED
    
    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3]; // The joint below the tip
    const thumbMcp = landmarks[2];

    const distThumbTipToWrist = distance(thumbTip, wrist);
    const distThumbIpToWrist = distance(thumbIp, wrist);

    // 1. Thumb must be extended (Tip further from wrist than IP joint)
    if (distThumbTipToWrist < distThumbIpToWrist) {
        return false;
    }

    // --- NEW: Thumb Proximity ---
    // Ensure thumb is next to index finger (not sticking out like 'L')
    const handScale = features.relativeDistances.wrist_middle;
    if (distance(thumbTip, landmarks[6]) > handScale * 0.9) return false;

    // Optional: Check if Thumb is not tucked 'too' far in (distinguishing from 'S')
    // For 'A', the thumb is usually adjacent to the Index finger
    // We can verify the thumb tip is relatively close to the Index MCP (Landmark 5)
    // normalized by the hand size (distance from wrist to index MCP)
    // This part is optional but helps precision.
    // if (thumbGap > handSize * 0.8) return false; // Thumb is sticking way out

    return true;
}

export function isLetterB(features: Features): boolean
{
    if (features.landmarks.length === 21)
    {
        let result : boolean[] = [] // for each finger, if it is curled (tip below knuckle)
        // [1 is mcp .. 2 is pip.. 3 is dip .. 4 is tip]
        // Check if fingers are curled: fingertip should be below (greater Y) than the knuckle (MCP)
        for (let fingerTipIndex of [8, 12, 16, 20]) // all but thumb
        {
            // tip.y > mcp.y means finger is curled down
            if (features.landmarks[fingerTipIndex].y < features.landmarks[fingerTipIndex-1].y &&
                features.landmarks[fingerTipIndex].y < features.landmarks[fingerTipIndex-2].y &&
                features.landmarks[fingerTipIndex].y < features.landmarks[fingerTipIndex-3].y
            )
            {
                result.push(true);
            }
        }
        
        // now check thumb, but before check if all results are true!
        if (result.length === 4 && result.every((val) => val === true))
        {
            // thumb: tip.x < dip.x < mcp.x (for right hand) 
            if (features.handedness === 'Right' &&
                features.landmarks[4].x < features.landmarks[1].x) // means that tip is left of dip
            {
                return true;
            } else if (features.handedness === 'Left' &&
                features.landmarks[4].x > features.landmarks[1].x)
            {
                return true;
            } 
        }
        return false;
    }
    return false;
}

export function isLetterC(features: Features): boolean 
{
    if (features.landmarks.length !== 21) return false;

    const { jointAngles, landmarks, relativeDistances, handOrientation } = features;
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const handScale = relativeDistances.wrist_middle;

    // C is usually signed with the palm facing sideways 
    // or slightly towards the camera. If the back of the hand faces the camera, it's not a C...
    if (handOrientation.palmNormalVector.z > 0.4) return false;


    // Unlike 'A' (tightly curled > 90*) or 'B' (flat < 20*), 
    // 'C' joints should be in a moderate "curved" range.
    const fingerBases = [
        jointAngles.index_base,
        jointAngles.middle_base,
        jointAngles.ring_base,
        jointAngles.pinky_base
    ];

    for (const angle of fingerBases) {
        // If fingers are too flat or too clenched, it's not a 'C'
        if (angle < 30 || angle > 85) return false;
    }

    // Thumb and Index must not be touching
    // In 'A', the thumb is tucked. In 'O', they touch. In 'C', there is a gap.
    const tipGap = distance(thumbTip, indexTip);
    if (tipGap < handScale * 0.4) return false;

    //  the thumb is curved and extended away from the wrist
    const thumbIp = landmarks[3];
    if (distance(thumbTip, wrist) < distance(thumbIp, wrist)) {
        return false; // Thumb is tucked/curled inward
    }

    // Thumb angle relative to the hand's "up" direction
    // Instead of screen X/Y, we ensure the thumb is not pointing straight up like 'A'
    const indexMcp = landmarks[5];
    const thumbToIndexDist = distance(thumbTip, indexMcp);
    
    if (thumbToIndexDist < handScale * 0.5) {
        return false; // Thumb is too close to the index knuckle (this is 'A' territory)
    }

    return true;
}

export function isLetterD(features: Features): boolean 
{
    if (features.landmarks.length !== 21) return false;

    const { landmarks, jointAngles, handOrientation, relativeDistances } = features;
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const handScale = relativeDistances.wrist_middle;

    // Palm faces camera z negative
    if (handOrientation.palmNormalVector.z > 0.1) return false;

    
    // We use joint angles: an extended finger should have a very small angle (near 0)
    if (jointAngles.index_base > 30 || jointAngles.index_tip > 30) {
        return false;
    }
    // Also verify the index tip is far from the wrist
    if (distance(indexTip, wrist) < distance(landmarks[6], wrist)) {
        return false;
    }

    // Curled Fingers: Middle, Ring, and Pinky must be curled
    // We check that their tips are closer to the wrist than their middle joints (PIPs)
    const curledFingers = [
        { tip: 12, pip: 10 }, // Middle
        { tip: 16, pip: 14 }, // Ring
        { tip: 20, pip: 18 }  // Pinky
    ];

    for (const finger of curledFingers) {
        if (distance(landmarks[finger.tip], wrist) > distance(landmarks[finger.pip], wrist)) {
            return false;
        }
    }

    // Middle finger tip touches thumb tip
    // In ASL 'D' the thumb tip touches the middle finger tip to form a circle.
    const thumbMiddleDist = distance(thumbTip, middleTip);
    
    // We compare this to handScale to keep it distance-independent
    if (thumbMiddleDist > handScale * 0.4) {
        return false; // The circle is not closed
    }

    // Index finger must be separated from the thumb/middle circle
    if (distance(indexTip, thumbTip) < handScale * 0.4) {
        return false; // Index is too close to thumb (this might be 'O')
    }

    return true;
}

export function isLetterE(features: Features): boolean
{
    // thumb under all fingers, fingers curlled in, palm facing camera
    if (features.landmarks.length !== 21) return false;

    const { landmarks, jointAngles, handOrientation, relativeDistances } = features;
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const handScale = relativeDistances.wrist_middle;

     // Palm faces camera z negative
    if (handOrientation.palmNormalVector.z > 0.1) return false;
    if (handOrientation.palmNormalVector.y < -0.5) return false; // not facing down
    // All fingers curled: tips closer to wrist than PIPs
    for (let finger of [8, 12, 16, 20]) {
        const pip = finger - 2;
        if (distance(landmarks[finger], wrist) > distance(landmarks[pip], wrist)) {
            return false;
        }
    }
    // Thumb tip close to base of pinky
    if (distance(thumbTip, landmarks[17]) > handScale * 0.6) {
        return false;
    }
    // thumb tip below index MCP in y-axis
    if (thumbTip.y < landmarks[5].y) {
        return false;
    }
    return true;

}

export function letterDetected(features: Features): string
{
    if (isLetterA(features))
        return "A";
    if (isLetterB(features))
        return "B";
    if (isLetterC(features))
        return "C";
    if (isLetterD(features))
        return "D";
    if (isLetterE(features))
        return "E";
    return "";
}