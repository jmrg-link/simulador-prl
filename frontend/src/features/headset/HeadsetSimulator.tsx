/**
 * Lienzo WebGL del simulador. Al crearse expone `canvas.captureStream()`: ese mismo `MediaStream`
 * alimenta la emisión WebRTC al instructor y la grabación que acaba en RTMP/HLS.
 */
import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { NeutralToneMapping, Scene } from "three";
import type { Hazard } from "../../shared/api/schemas.ts";
import { FullscreenFrame } from "../../shared/ui/FullscreenFrame.tsx";
import { HeadsetRig, type PendingDecision } from "./scene/HeadsetRig.tsx";
import { FocusComposer } from "./scene/FocusComposer.tsx";
import { useWorkshop } from "./scene/models.ts";
import { Workshop } from "./scene/Workshop.tsx";

const CAPTURE_FPS = 30;

/** Props del simulador. */
interface HeadsetSimulatorProps {
  hazards: Hazard[];
  detected: ReadonlySet<string>;
  traineeName: string;
  scenarioTitle: string;
  recording: boolean;
  remainingS: number;
  decision: PendingDecision | null;
  onDetect(hazardId: string, reactionMs: number): void;
  onStream(stream: MediaStream): void;
}

/** Props del contenido de la escena. */
type SceneProps = Omit<HeadsetSimulatorProps, "onStream"> & { onReady(): void };

/** Contenido de la escena; suspende hasta que cargan los modelos y el HDRI. */
const SceneContents = ({ hazards, detected, traineeName, scenarioTitle, recording, remainingS, decision, onDetect, onReady }: SceneProps) => {
  const workshop = useWorkshop();
  useEffect(() => onReady(), [onReady]);
  const [gazed, setGazed] = useState<string | null>(null);
  const hazardRoots = useMemo(() => workshop.hazards.map(({ root }) => root), [workshop]);
  const hud = useMemo(() => new Scene(), []);
  const focusTargets = useMemo(() => [workshop.scene], [workshop]);
  return (
    <>
      <Workshop workshop={workshop} gazed={gazed} detected={detected} />
      <FocusComposer hud={hud} targets={focusTargets} />
      <HeadsetRig
        hazardRoots={hazardRoots}
        hud={hud}
        hazards={hazards}
        detectedCount={detected.size}
        traineeName={traineeName}
        scenarioTitle={scenarioTitle}
        recording={recording}
        remainingS={remainingS}
        decision={decision}
        onGazeChange={setGazed}
        onDetect={onDetect}
      />
    </>
  );
};

/** Aviso sobre el lienzo mientras se descargan el taller, el operario y el HDRI. */
const LoadingNotice = () => (
  <p className="absolute inset-0 flex items-center justify-center caps text-sm text-coupon/80" role="status">
    Cargando el taller…
  </p>
);

/** Escena completa del alumno con las gafas puestas. */
export const HeadsetSimulator = ({ onStream, ...scene }: HeadsetSimulatorProps) => {
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);
  return (
  <FullscreenFrame label="Vista del alumno">
  <div
    className="relative h-full w-full overflow-hidden bg-navy"
    role="img"
    aria-label="Vista en primera persona del alumno en el taller. Arrastra o usa las flechas para mirar alrededor; mantén la retícula sobre un riesgo para identificarlo."
  >
    <Canvas
      shadows="percentage"
      gl={{ antialias: true, toneMapping: NeutralToneMapping, toneMappingExposure: 1 }}
      camera={{ fov: 70, near: 0.05, far: 60, position: [2.2, 2.1, 2.6] }}
      onCreated={({ gl }) => onStream(gl.domElement.captureStream(CAPTURE_FPS))}
      className="cursor-grab active:cursor-grabbing"
    >
      <Suspense fallback={null}>
        <SceneContents {...scene} onReady={markReady} />
      </Suspense>
    </Canvas>
    {!ready && <LoadingNotice />}
  </div>
  </FullscreenFrame>
  );
};
