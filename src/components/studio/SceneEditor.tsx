"use client";

import { useEffect } from "react";
import { Viewport, type Transform, type TransformMode } from "./Viewport";
import type { CameraState } from "@/lib/three/captureOffscreen";
import { ViewBar } from "./ViewBar";
import { SceneGraph } from "./SceneGraph";
import { TransformPanel } from "./TransformPanel";
import { RailSection } from "./RailSection";
import { findItem, type SceneState } from "@/lib/scene/sceneItem";
import type { ViewDirection } from "@/lib/three/framing";

type SceneEditorProps = {
  readonly scene: SceneState;
  readonly transformMode: TransformMode;
  readonly framingRequest: { direction: ViewDirection; token: number } | null;
  readonly onSelect: (id: string | null) => void;
  readonly onTransform: (id: string, transform: Transform) => void;
  readonly onCameraChange: (camera: CameraState) => void;
  readonly onModeChange: (mode: TransformMode) => void;
  readonly onToggleVisible: (id: string) => void;
  readonly onToggleGhost: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onFrame: (direction: ViewDirection) => void;
  readonly onClose: () => void;
};

/**
 * The positioning view, opened by double-clicking a 3D card.
 *
 * Placement genuinely needs a viewport: a card can show what a part is, but
 * deciding where it sits inside an enclosure needs orbiting, a gizmo and real
 * millimetre readouts. Everything on the stage is shown at once, because a part
 * can only be positioned in relation to the things around it.
 */
export function SceneEditor({
  scene,
  transformMode,
  framingRequest,
  onSelect,
  onTransform,
  onCameraChange,
  onModeChange,
  onToggleVisible,
  onToggleGhost,
  onRemove,
  onFrame,
  onClose,
}: SceneEditorProps) {
  const selected = findItem(scene, scene.selectedId);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      // Blender-style shortcuts, which this audience will already know.
      if (event.key === "g") onModeChange("translate");
      if (event.key === "r") onModeChange("rotate");
      if (event.key === "s") onModeChange("scale");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onModeChange]);

  return (
    <div className="fixed inset-0 z-40 bg-canvas">
      <div className="absolute inset-0">
        <Viewport
          items={scene.items}
          selectedId={scene.selectedId}
          transformMode={transformMode}
          gizmoEnabled
          onSelect={onSelect}
          onTransform={onTransform}
          onCameraChange={onCameraChange}
          framingRequest={framingRequest}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 flex flex-col gap-3 p-3">
        <header className="glass backdrop-blur-2xl backdrop-saturate-150 pointer-events-auto flex h-11 items-center justify-between gap-3 rounded-xl px-3">
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-semibold text-text">
              Position parts
            </span>
            <span className="text-[13.5px] text-faint">
              Drag the gizmo, or type exact millimetres on the right
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-accent px-3 py-1.5 text-[15px] font-semibold text-accent-ink transition-all hover:brightness-110"
          >
            Done
          </button>
        </header>

        <div className="flex min-h-0 flex-1 gap-3">
          <aside className="glass backdrop-blur-2xl backdrop-saturate-150 pointer-events-auto flex w-[250px] shrink-0 flex-col overflow-y-auto rounded-xl">
            <RailSection title="On the stage">
              <SceneGraph
                items={scene.items}
                selectedId={scene.selectedId}
                onSelect={onSelect}
                onToggleVisible={onToggleVisible}
                onToggleGhost={onToggleGhost}
                onRemove={onRemove}
              />
            </RailSection>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col items-center">
            <ViewBar onFrame={onFrame} disabled={scene.items.length === 0} />
          </div>

          <aside className="glass backdrop-blur-2xl backdrop-saturate-150 pointer-events-auto w-[270px] shrink-0 overflow-y-auto rounded-xl">
            {selected ? (
              <RailSection title="Selected" hint={selected.name}>
                <TransformPanel
                  item={selected}
                  mode={transformMode}
                  onModeChange={onModeChange}
                  onChange={(transform) => onTransform(selected.id, transform)}
                />
              </RailSection>
            ) : (
              <RailSection title="Selected">
                <p className="text-[14px] leading-relaxed text-faint">
                  Click a part in the viewport, or pick one from the list, to
                  move and rotate it.
                </p>
              </RailSection>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
