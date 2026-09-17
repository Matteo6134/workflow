"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import {
  EMPTY_SCENE,
  addItem,
  createId,
  findItem,
  removeItem,
  selectItem,
  updateItem,
  type SceneItem,
  type SceneState,
} from "./sceneItem";
import {
  loadModel,
  disposeModel,
  UNIT_TO_MM,
  type ModelUnit,
} from "@/lib/three/loadModel";
import { captureSizeFor } from "@/lib/three/capture";
import {
  captureSceneOffscreen,
  computeCameraState,
  type CameraState,
} from "@/lib/three/captureOffscreen";
import { renderThumbnail } from "@/lib/three/thumbnail";
import { isSafeToDispose } from "./disposal";
import { composePrompt, EMPTY_SELECTION } from "@/lib/presets/composePrompt";
import type { PromptSelection } from "@/lib/presets/composePrompt";
import { DEFAULT_SETTINGS, type RenderSettings, type RenderedImage } from "@/lib/types";
import { isLibraryComponent, type ComponentSpec } from "@/lib/catalog";
import { loadComponentFromUrl, measure } from "@/lib/three/loadComponent";
import type { Transform, TransformMode } from "@/components/studio/Viewport";
import { writeTransform } from "@/components/studio/Viewport";
import type { ViewDirection } from "@/lib/three/framing";

export type BackendStatusView = {
  readonly activeBackend: string;
  /** The service was actually reached. False means renders will fail. */
  readonly backendLive: boolean;
  readonly backendError: string | null;
  readonly instagramReady: boolean;
  readonly instagramUsername: string | null;
  readonly quotaUsed: number | null;
};

const IDENTITY: Transform = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

/**
 * Owns all workbench state.
 *
 * Scene mutations go through the immutable helpers in sceneItem.ts; the only
 * imperative work is writing transforms onto the live three.js objects, which
 * cannot be expressed as data alone.
 */
export function useStudio() {
  const [scene, setScene] = useState<SceneState>(EMPTY_SCENE);
  const [selection, setSelection] = useState<PromptSelection>(EMPTY_SELECTION);
  const [settings, setSettings] = useState<RenderSettings>(DEFAULT_SETTINGS);
  const [transformMode, setTransformMode] = useState<TransformMode>("translate");
  const [results, setResults] = useState<readonly RenderedImage[]>([]);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [loadingComponentId, setLoadingComponentId] = useState<string | null>(null);
  const [status, setStatus] = useState<BackendStatusView | null>(null);
  const [framingRequest, setFramingRequest] = useState<{
    direction: ViewDirection;
    token: number;
  } | null>(null);

  /**
   * The camera the user framed in the 3D editor. Capture builds its own
   * renderer from this, so rendering works from the board without a mounted
   * viewport. Null means "frame it automatically".
   */
  const [cameraState, setCameraState] = useState<CameraState | null>(null);

  // Backend and Instagram readiness, so problems surface before any work.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/status")
      .then((response) => response.json())
      .then((body) => {
        if (cancelled) return;
        const active = body.backends?.find(
          (backend: { active: boolean }) => backend.active,
        );
        setStatus({
          activeBackend: active?.label ?? body.activeBackend ?? "unknown",
          backendLive: active?.live !== false,
          backendError: active?.error ?? null,
          instagramReady: Boolean(body.instagram?.configured),
          instagramUsername: body.instagram?.username ?? null,
          quotaUsed: body.instagram?.quotaUsed ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const frameView = useCallback((direction: ViewDirection) => {
    setFramingRequest({ direction, token: Date.now() });
  }, []);

  /** Resolves to the new item's id, so the caller can place its card. */
  const importProduct = useCallback(
    async (file: File, unit: ModelUnit = "mm"): Promise<string | null> => {
      setLoadingModel(true);
      setError(null);
      try {
        const model = await loadModel(file, unit);
        const id = createId("product");
        const item: SceneItem = {
          id,
          name: file.name,
          kind: "product",
          object: model.object,
          visible: true,
          ghosted: false,
          unit,
          ...IDENTITY,
          dimensionsMm: {
            x: model.sourceDimensions.x,
            y: model.sourceDimensions.y,
            z: model.sourceDimensions.z,
          },
          thumbnail: renderThumbnail(model.object),
          triangleCount: model.triangleCount,
        };
        setScene((current) => addItem(current, item));
        frameView("iso");
        return id;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
        return null;
      } finally {
        setLoadingModel(false);
      }
    },
    [frameView],
  );

  /**
   * Adds a catalogue part.
   *
   * Library parts are fetched and parsed (STEP via WASM, VRML directly), which
   * is asynchronous; generated parts are built synchronously. Both end up
   * measured from their real geometry, so the dimensions shown on the stage are
   * the part's own rather than a figure typed into the catalogue.
   */
  const addComponent = useCallback(
    async (
      spec: ComponentSpec,
      params: Record<string, number>,
    ): Promise<string | null> => {
      setError(null);
      setLoadingComponentId(spec.id);

      try {
        const object = isLibraryComponent(spec)
          ? await loadComponentFromUrl(spec.source.url)
          : spec.build(params);

        const size = isLibraryComponent(spec)
          ? measure(object)
          : new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());

        const id = createId(spec.id);
        const item: SceneItem = {
          id,
          name: spec.name,
          kind: "component",
          object,
          visible: true,
          ghosted: false,
          // Catalogue parts are authored in millimetres by definition.
          unit: "mm",
          ...IDENTITY,
          dimensionsMm: { x: size.x, y: size.y, z: size.z },
          thumbnail: renderThumbnail(object),
          triangleCount: 0,
        };
        setScene((current) => addItem(current, item));
        return id;
      } catch (cause) {
        setError(
          `Could not add ${spec.name}: ${
            cause instanceof Error ? cause.message : String(cause)
          }`,
        );
        return null;
      } finally {
        setLoadingComponentId(null);
      }
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setScene((current) => {
      const item = findItem(current, id);
      if (item) {
        const others = current.items
          .filter((other) => other.id !== id)
          .map((other) => other.object);
        // Duplicates share geometry and materials, so freeing them while
        // another copy is still on the stage would blank that copy out.
        if (isSafeToDispose(item.object, others)) disposeModel(item.object);
      }
      return removeItem(current, id);
    });
  }, []);

  /**
   * Clones an item. Geometry and materials are shared with the original, which
   * keeps this cheap; {@link remove} knows not to dispose shared resources.
   */
  const duplicate = useCallback((id: string) => {
    setScene((current) => {
      const item = findItem(current, id);
      if (!item) return current;

      const clone = item.object.clone(true);
      // Offset slightly so the copy is visibly distinct from its original.
      const offset = item.dimensionsMm ? item.dimensionsMm.x * 0.6 + 5 : 10;
      clone.position.x += offset;

      return addItem(current, {
        ...item,
        id: createId("copy"),
        name: `${item.name} copy`,
        object: clone,
        position: { ...item.position, x: item.position.x + offset },
      });
    });
  }, []);

  const select = useCallback((id: string | null) => {
    setScene((current) => selectItem(current, id));
  }, []);

  const toggleVisible = useCallback((id: string) => {
    setScene((current) => {
      const item = findItem(current, id);
      if (!item) return current;
      return updateItem(current, id, { visible: !item.visible });
    });
  }, []);

  const toggleGhost = useCallback((id: string) => {
    setScene((current) => {
      const item = findItem(current, id);
      if (!item) return current;
      return updateItem(current, id, { ghosted: !item.ghosted });
    });
  }, []);

  /** Applies a transform to both the live object and the state mirror. */
  const applyTransform = useCallback((id: string, transform: Transform) => {
    setScene((current) => {
      const item = findItem(current, id);
      if (!item) return current;
      writeTransform(item.object, transform);
      return updateItem(current, id, {
        position: transform.position,
        rotation: transform.rotation,
        scale: transform.scale,
      });
    });
  }, []);

  /** Objects currently on stage and visible; what any capture should include. */
  const visibleObjects = useMemo(
    () => scene.items.filter((item) => item.visible).map((item) => item.object),
    [scene.items],
  );

  const captureReady = visibleObjects.length > 0;

  /** Captures the control maps without spending a render, for inspection. */
  const capturePreview = useCallback(() => {
    if (visibleObjects.length === 0) return null;
    const [width, height] = captureSizeFor(settings.imageSize, settings.resolution);
    try {
      return captureSceneOffscreen({
        objects: visibleObjects,
        camera: cameraState,
        width,
        height,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return null;
    }
  }, [visibleObjects, cameraState, settings.imageSize, settings.resolution]);

  /**
   * Re-interprets an imported file's units and rescales in place.
   *
   * STL carries no unit information, so this is a judgement the user can only
   * make once they see the measured size. Correcting it afterwards beats asking
   * before the model is even on screen. Position scales with the object because
   * centring was applied in the old unit.
   */
  const setItemUnit = useCallback((id: string, unit: ModelUnit) => {
    setScene((current) => {
      const item = findItem(current, id);
      if (!item || item.unit === unit) return current;

      const ratio = UNIT_TO_MM[unit] / UNIT_TO_MM[item.unit];
      item.object.scale.multiplyScalar(ratio);
      item.object.position.multiplyScalar(ratio);
      item.object.updateMatrixWorld(true);

      const size = new THREE.Box3()
        .setFromObject(item.object)
        .getSize(new THREE.Vector3());

      return updateItem(current, id, {
        unit,
        dimensionsMm: { x: size.x, y: size.y, z: size.z },
        thumbnail: renderThumbnail(item.object),
      });
    });
  }, []);

  const clearResults = useCallback(() => setResults([]), []);

  const resetLook = useCallback(() => setSelection(EMPTY_SELECTION), []);

  /**
   * Sets the render camera to a named view without opening the 3D editor.
   * Framing is pure geometry, so this works straight from a board card.
   */
  const setPerspective = useCallback(
    (direction: ViewDirection) => {
      const next = computeCameraState(visibleObjects, direction);
      if (next) setCameraState(next);
      // Keep the editor in step if it happens to be open.
      frameView(direction);
    },
    [visibleObjects, frameView],
  );

  const render = useCallback(async () => {
    if (visibleObjects.length === 0) {
      setError("Add a 3D model to the stage before rendering");
      return;
    }

    setRendering(true);
    setError(null);

    try {
      const [width, height] = captureSizeFor(settings.imageSize, settings.resolution);
      // `mask` stays in the browser; only the control passes are uploaded.
      const { mask: _mask, ...passes } = captureSceneOffscreen({
        objects: visibleObjects,
        camera: cameraState,
        width,
        height,
      });

      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passes,
          settings: { ...settings, prompt: composePrompt(selection) },
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "The render failed");
        return;
      }
      setResults((current) => [...body.images, ...current]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setRendering(false);
    }
  }, [settings, selection, visibleObjects, cameraState]);

  return {
    scene,
    selection,
    settings,
    transformMode,
    results,
    rendering,
    error,
    loadingModel,
    loadingComponentId,
    status,
    framingRequest,
    captureReady,
    cameraState,
    composedPrompt: composePrompt(selection),
    setSelection,
    setSettings,
    setTransformMode,
    setError,
    setCameraState,
    importProduct,
    addComponent,
    remove,
    select,
    toggleVisible,
    toggleGhost,
    setPerspective,
    setItemUnit,
    duplicate,
    clearResults,
    resetLook,
    applyTransform,
    frameView,
    capturePreview,
    render,
  };
}
