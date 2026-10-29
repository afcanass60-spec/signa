"use client";
/**
 * Webcam + squelette en direct + enregistrement d'une séquence de features.
 * Usage : const ref = useRef<LiveCameraHandle>(null); const seq = await ref.current.record(2500);
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { getTracker, type Tracker } from "@/lib/tracker";
import { drawRaw, themePalette } from "@/lib/draw";
import { extractFeatures, mirrorFeatures } from "@/lib/features";

export interface LiveCameraHandle {
  /** Enregistre pendant `ms` millisecondes et renvoie les features image par image. */
  record(ms: number): Promise<number[][]>;
}

type Status = "loading" | "ready" | "denied" | "error";

export const LiveCamera = forwardRef<LiveCameraHandle, { lefty?: boolean; recording?: boolean; overlay?: React.ReactNode }>(
  function LiveCamera({ lefty = false, recording = false, overlay }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState<Status>("loading");
    const [error, setError] = useState("");
    const [handsSeen, setHandsSeen] = useState(0);
    const buffer = useRef<number[][] | null>(null);
    const leftyRef = useRef(lefty);
    leftyRef.current = lefty;

    useImperativeHandle(ref, () => ({
      record(ms) {
        buffer.current = [];
        return new Promise((resolve) => {
          setTimeout(() => {
            const out = buffer.current ?? [];
            buffer.current = null;
            resolve(out);
          }, ms);
        });
      },
    }));

    useEffect(() => {
      let stream: MediaStream | null = null;
      let raf = 0;
      let tracker: Tracker | null = null;
      let cancelled = false;
      const palette = themePalette();

      async function start() {
        if (!navigator.mediaDevices?.getUserMedia) {
          setStatus("error");
          setError("Ce navigateur ne donne pas accès à la caméra. Utilise Chrome, Edge, Firefox ou Safari, en https (ou sur localhost).");
          return;
        }
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: "user" },
            audio: false,
          });
        } catch (e) {
          if (cancelled) return;
          const name = e instanceof DOMException ? e.name : "";
          setStatus(name === "NotAllowedError" ? "denied" : "error");
          setError(
            name === "NotFoundError"
              ? "Aucune webcam détectée sur cet appareil."
              : name === "NotReadableError"
                ? "La webcam est déjà utilisée par une autre application. Ferme-la puis recharge la page."
                : String(e),
          );
          return;
        }
        // le composant a pu être démonté pendant la demande d'autorisation : on coupe la caméra
        if (cancelled || !videoRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play().catch(() => {});
        try {
          tracker = await getTracker();
        } catch (e) {
          if (cancelled) return;
          setStatus("error");
          setError("Impossible de charger le modèle de suivi des mains. Vérifie ta connexion internet, puis recharge la page." + (e instanceof Error ? ` (${e.message})` : ""));
          return;
        }
        if (cancelled) return;
        setStatus("ready");

        let lastVideoTime = -1;
        let seenStreak = 0;
        const loop = () => {
          raf = requestAnimationFrame(loop);
          if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
          lastVideoTime = video.currentTime;
          const frame = tracker!.detect(video);
          const canvas = canvasRef.current;
          if (canvas) {
            if (canvas.width !== video.videoWidth) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }
            const ctx = canvas.getContext("2d")!;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawRaw(ctx, frame, palette);
          }
          const n = (frame.left ? 1 : 0) + (frame.right ? 1 : 0);
          seenStreak = n;
          setHandsSeen((prev) => (prev === seenStreak ? prev : seenStreak));
          if (buffer.current) {
            const f = extractFeatures(frame);
            buffer.current.push(leftyRef.current ? mirrorFeatures(f) : f);
          }
        };
        loop();
      }
      start();

      return () => {
        cancelled = true;
        cancelAnimationFrame(raf);
        stream?.getTracks().forEach((t) => t.stop());
      };
    }, []);

    return (
      <div className="relative w-full overflow-hidden rounded-[20px] bg-surface-2 aspect-[4/3] max-w-full">
        <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover -scale-x-100" />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" />
        {recording && <div className="absolute inset-0 rounded-[20px] ring-4 ring-inset ring-bad pointer-events-none" />}

        {status === "ready" && (
          <div className="absolute left-3 top-3 rounded-full bg-surface/85 px-3 py-1 text-sm font-bold backdrop-blur">
            {handsSeen === 0 ? (
              <span className="text-muted">Montre tes mains</span>
            ) : (
              <span className="text-ok">
                {handsSeen === 2 ? "2 mains détectées" : "1 main détectée"}
              </span>
            )}
          </div>
        )}
        {status === "loading" && (
          <div className="absolute inset-0 grid place-items-center text-center p-6 text-muted bg-surface-2">
            Démarrage de la caméra et du modèle de suivi…
          </div>
        )}
        {(status === "denied" || status === "error") && (
          <div className="absolute inset-0 grid place-items-center p-4 bg-surface-2">
            <div className="max-w-sm text-center">
              <p className="font-bold">{status === "denied" ? "L'accès à la caméra est bloqué." : "La caméra n'a pas pu démarrer."}</p>
              <p className="text-sm text-muted mt-2">
                {status === "denied"
                  ? "Autorise la caméra pour ce site (icône à gauche de la barre d'adresse), puis recharge la page. Les images ne quittent jamais ton appareil."
                  : error}
              </p>
            </div>
          </div>
        )}
        {overlay}
      </div>
    );
  },
);
