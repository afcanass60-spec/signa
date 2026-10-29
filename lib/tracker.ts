"use client";
/**
 * Suivi du corps et des mains dans le navigateur (MediaPipe Tasks Vision).
 * Tout tourne en local sur l'appareil de l'utilisateur : aucune image n'est envoyée
 * à un serveur. C'est un argument fort pour la vie privée.
 */
import type { HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { Point3, RawFrame } from "./features";

const VERSION = "1.1.1";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const HAND_MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";
const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

export interface Tracker {
  detect(video: HTMLVideoElement): RawFrame;
  close(): void;
}

let shared: Promise<Tracker> | null = null;

/** Charge les modèles une seule fois pour toute l'app (~10 Mo, mis en cache par le navigateur). */
export function getTracker(): Promise<Tracker> {
  if (!shared) shared = createTracker().catch((e) => { shared = null; throw e; });
  return shared;
}

async function createTracker(): Promise<Tracker> {
  const { FilesetResolver, HandLandmarker, PoseLandmarker } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);

  async function make<T>(fn: (delegate: "GPU" | "CPU") => Promise<T>): Promise<T> {
    try {
      return await fn("GPU");
    } catch {
      return await fn("CPU"); // certains navigateurs/PC n'ont pas WebGL2
    }
  }

  const hands: HandLandmarker = await make((delegate) =>
    HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: HAND_MODEL, delegate },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    }),
  );
  const pose: PoseLandmarker = await make((delegate) =>
    PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: POSE_MODEL, delegate },
      runningMode: "VIDEO",
      numPoses: 1,
    }),
  );

  let lastTs = -1;
  // On donne l'image brute de la webcam au modèle, puis on la passe en miroir :
  // x -> 1 - x, et on échange gauche/droite (MediaPipe suppose une image déjà en miroir).
  // Résultat identique au projet Python, qui retourne l'image avant détection.
  const mirror = (pts: { x: number; y: number; z: number }[]): Point3[] => pts.map((p) => [1 - p.x, p.y, p.z]);

  return {
    detect(video) {
      const ts = Math.max(Math.round(performance.now()), lastTs + 1);
      lastTs = ts;
      const frame: RawFrame = { pose: null, left: null, right: null };
      const p = pose.detectForVideo(video, ts);
      if (p.landmarks?.[0]) frame.pose = mirror(p.landmarks[0]);
      const h = hands.detectForVideo(video, ts);
      h.landmarks.forEach((lms, i) => {
        const label = h.handedness?.[i]?.[0]?.categoryName?.toLowerCase();
        // image non miroir -> l'étiquette "left" correspond à la main droite de la personne
        const side = label === "left" ? "right" : "left";
        if (!frame[side]) frame[side] = mirror(lms);
      });
      return frame;
    },
    close() {
      hands.close();
      pose.close();
      shared = null;
    },
  };
}
