"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, TransformControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { HELPER_FLAG } from "@/lib/three/capture";
import type { CameraState } from "@/lib/three/captureOffscreen";
import { applyFraming, frameObject } from "@/lib/three/framing";
import type { ViewDirection } from "@/lib/three/framing";
import type { SceneItem, Vec3 } from "@/lib/scene/sceneItem";

export type TransformMode = "translate" | "rotate" | "scale";

export type Transform = {
  readonly position: Vec3;
  readonly rotation: Vec3;
  readonly scale: Vec3;
};

type ViewportProps = {
  readonly items: readonly SceneItem[];
  readonly selectedId: string | null;
  readonly transformMode: TransformMode;
  readonly gizmoEnabled: boolean;
  readonly onSelect: (id: string | null) => void;
  readonly onTransform: (id: string, transform: Transform) => void;
  /** Reports the framed camera, which capture later rebuilds offscreen. */
  readonly onCameraChange: (camera: CameraState) => void;
  /** Bumped to request a re-frame; the value is the direction to frame from. */
  readonly framingRequest: { direction: ViewDirection; token: number } | null;
};

export function Viewport(props: ViewportProps) {
  return (
    <Canvas
      // Without preserveDrawingBuffer the buffer is cleared before toDataURL
      // can read it, and every captured pass comes back blank.
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ position: [120, 90, 160], fov: 40, near: 1, far: 5000 }}
      dpr={[1, 2]}
      onPointerMissed={() => props.onSelect(null)}
    >
      <StudioLighting />
      <SceneContents {...props} />
    </Canvas>
  );
}

/**
 * A neutral three-point setup lighting the *beauty* pass, which seeds img2img.
 * The dramatic lighting the user picks is produced by the model, so this stays
 * deliberately even and uncoloured.
 */
function StudioLighting() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[200, 260, 180]} intensity={2.2} />
      <directionalLight position={[-240, 120, -140]} intensity={0.9} />
      <directionalLight position={[0, -160, 120]} intensity={0.35} />
    </>
  );
}

function SceneContents({
  items,
  selectedId,
  transformMode,
  gizmoEnabled,
  onSelect,
  onTransform,
  onCameraChange,
  framingRequest,
}: ViewportProps) {
  const stageRef = useRef<THREE.Group>(null);
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const controls = useThree((state) => state.controls) as
    | { target: THREE.Vector3; update: () => void }
    | null;

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const visibleCount = items.filter((item) => item.visible).length;
  // Derived from the items themselves rather than from the live object graph,
  // so nothing reads a ref during render.
  const gridSpacing = useMemo(() => gridSpacingForItems(items), [items]);

  /** Publishes the current camera so an offscreen capture can reproduce it. */
  const publishCamera = useCallback(() => {
    const target = controls?.target ?? new THREE.Vector3();
    onCameraChange({
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [target.x, target.y, target.z],
      fov: camera.fov,
    });
  }, [camera, controls, onCameraChange]);

  // Re-frame when asked, once the geometry is actually in the scene.
  useEffect(() => {
    const stage = stageRef.current;
    if (!framingRequest || !stage || visibleCount === 0) return;
    const framing = frameObject(stage, camera, framingRequest.direction);
    if (framing) {
      applyFraming(framing, camera, controls);
      publishCamera();
    }
  }, [framingRequest, camera, controls, visibleCount, publishCamera]);

  const handleObjectChange = useCallback(() => {
    if (!selected) return;
    onTransform(selected.id, readTransform(selected.object));
  }, [selected, onTransform]);

  return (
    <>
      <group userData={{ [HELPER_FLAG]: true }}>
        <Grid
          args={[gridSpacing * 40, gridSpacing * 40]}
          cellSize={gridSpacing}
          cellThickness={0.5}
          cellColor="#262a31"
          sectionSize={gridSpacing * 5}
          sectionThickness={0.9}
          sectionColor="#363c45"
          fadeDistance={gridSpacing * 90}
          fadeStrength={1.4}
          infiniteGrid
        />
      </group>

      <group ref={stageRef}>
        {items.map((item) => (
          <primitive
            key={item.id}
            object={item.object}
            visible={item.visible}
            onClick={(event: { stopPropagation: () => void }) => {
              event.stopPropagation();
              onSelect(item.id);
            }}
          />
        ))}
      </group>

      {selected && gizmoEnabled && selected.visible ? (
        <TransformControls
          object={selected.object}
          mode={transformMode}
          size={0.8}
          onObjectChange={handleObjectChange}
        />
      ) : null}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        // Publish once the user stops moving, rather than every frame.
        onEnd={publishCamera}
        // Suits a scene measured in millimetres.
        minDistance={5}
        maxDistance={4000}
      />
    </>
  );
}

/**
 * Picks a grid step matched to the size of what is on the stage, using the
 * recorded millimetre dimensions.
 */
function gridSpacingForItems(items: readonly SceneItem[]): number {
  const largest = items.reduce((max, item) => {
    const d = item.dimensionsMm;
    if (!d) return max;
    return Math.max(max, d.x, d.y, d.z);
  }, 0);

  if (largest <= 0) return 10;

  // Round to a familiar engineering step (1, 2, 5, 10, 20, 50 mm...).
  const rough = largest / 10;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(rough, 0.001)));
  const normalized = rough / magnitude;
  const step = normalized < 1.5 ? 1 : normalized < 3.5 ? 2 : normalized < 7.5 ? 5 : 10;
  return step * magnitude;
}

const RAD_TO_DEG = 180 / Math.PI;

/** Reads a three.js object transform back into plain data, rotation in degrees. */
export function readTransform(object: THREE.Object3D): Transform {
  return {
    position: {
      x: round(object.position.x),
      y: round(object.position.y),
      z: round(object.position.z),
    },
    rotation: {
      x: round(object.rotation.x * RAD_TO_DEG),
      y: round(object.rotation.y * RAD_TO_DEG),
      z: round(object.rotation.z * RAD_TO_DEG),
    },
    scale: {
      x: round(object.scale.x, 4),
      y: round(object.scale.y, 4),
      z: round(object.scale.z, 4),
    },
  };
}

/** Writes plain data back onto a three.js object. */
export function writeTransform(
  object: THREE.Object3D,
  transform: Transform,
): void {
  object.position.set(
    transform.position.x,
    transform.position.y,
    transform.position.z,
  );
  object.rotation.set(
    transform.rotation.x / RAD_TO_DEG,
    transform.rotation.y / RAD_TO_DEG,
    transform.rotation.z / RAD_TO_DEG,
  );
  object.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
