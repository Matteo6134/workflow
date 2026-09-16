"use client";

import { useCallback, useMemo, useState } from "react";
import { useStudio } from "@/lib/scene/useStudio";
import { isRenderable } from "@/lib/presets/composePrompt";
import {
  CARD_HEIGHT,
  zoomViewport,
  type BoardViewport,
  type Point,
} from "@/lib/board/boardState";
import type { CapturePasses, RenderedImage } from "@/lib/types";
import { Board } from "@/components/board/Board";
import { ObjectCard } from "@/components/board/ObjectCard";
import { LookCard } from "@/components/board/LookCard";
import { RenderCard } from "@/components/board/RenderCard";
import { CardMenu, type CardActionGroup } from "@/components/board/CardMenu";
import { VIEW_LABELS, type ViewDirection } from "@/lib/three/framing";
import { TopBar } from "./TopBar";
import { SceneEditor } from "./SceneEditor";
import { ResultPreview } from "./ResultPreview";
import { PassInspector } from "./PassInspector";
import { BoardToolbar } from "./BoardToolbar";

const GAP = 36;
const LOOK_CARD_ID = "look";
const RENDER_CARD_ID = "renders";

/**
 * Explicit column origins, because the cards are not all the same width -
 * deriving them from a single CARD_WIDTH made the wider Look card overlap its
 * neighbour.
 */
const COLUMN_X = [80, 420, 790] as const;

/** Offered on every card, so the render angle is one click away. */
const VIEW_ORDER: readonly ViewDirection[] = [
  "iso",
  "front",
  "back",
  "left",
  "right",
  "top",
];

/**
 * The board is the home surface.
 *
 * Object cards are derived directly from the scene rather than stored
 * alongside it, so the two can never drift out of step; only the card
 * POSITIONS are held here, keyed by card id.
 */
export function Studio() {
  const studio = useStudio();

  const [viewport, setViewport] = useState<BoardViewport>({
    pan: { x: 0, y: 0 },
    zoom: 1,
  });
  const [positions, setPositions] = useState<Record<string, Point>>({});
  const [order, setOrder] = useState<readonly string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [preview, setPreview] = useState<RenderedImage | null>(null);
  const [passes, setPasses] = useState<CapturePasses | null>(null);

  const hasModel = studio.scene.items.length > 0;
  const hasLook = isRenderable(studio.selection);

  const blockedReason = !studio.captureReady
    ? "Add a 3D model to the stage first."
    : !hasLook
      ? "Describe what the product is."
      : (studio.status?.backendError ?? null);

  /** Assigns a slot the first time a card is seen, then remembers it. */
  const positionFor = useCallback(
    (id: string, index: number, column: number): Point => {
      const existing = positions[id];
      if (existing) return existing;
      return {
        x: COLUMN_X[column] ?? COLUMN_X[COLUMN_X.length - 1],
        y: 80 + index * (CARD_HEIGHT + GAP),
      };
    },
    [positions],
  );

  const moveCard = useCallback((id: string, position: Point) => {
    setPositions((current) => ({ ...current, [id]: position }));
  }, []);

  const focusCard = useCallback((id: string) => {
    setOrder((current) => [...current.filter((item) => item !== id), id]);
  }, []);

  const panBy = useCallback((delta: Point) => {
    setViewport((current) => ({
      ...current,
      pan: { x: current.pan.x + delta.x, y: current.pan.y + delta.y },
    }));
  }, []);

  const zoomAt = useCallback((factor: number, point: Point) => {
    setViewport((current) => zoomViewport(current, factor, point));
  }, []);

  /** Pans the board so a card is centred, then raises it. */
  const bringIntoView = useCallback(
    (id: string, fallback: Point) => {
      const target = positions[id] ?? fallback;
      setViewport((current) => ({
        ...current,
        pan: {
          x: window.innerWidth / 2 - (target.x + 165) * current.zoom,
          y: 140 - target.y * current.zoom,
        },
      }));
      focusCard(id);
    },
    [positions, focusCard],
  );

  const openEditor = useCallback(
    (itemId: string) => {
      studio.select(itemId);
      setEditorOpen(true);
    },
    [studio],
  );

  // A backend that is not answering cannot render, so the action is offered
  // only when the service was actually reached.
  const backendReady = studio.status?.backendLive !== false;
  const canRender = studio.captureReady && hasLook && backendReady;

  /** Perspective chips - the render camera, changeable without opening 3D. */
  const perspectiveGroup: CardActionGroup = {
    label: "Perspective",
    actions: VIEW_ORDER.map((direction) => ({
      id: `view-${direction}`,
      label: VIEW_LABELS[direction],
      hint: `Render from the ${VIEW_LABELS[direction].toLowerCase()} view`,
      compact: true,
      disabled: !hasModel,
      onSelect: () => studio.setPerspective(direction),
    })),
  };

  const renderGroup: CardActionGroup = {
    label: "Render",
    actions: [
      {
        id: "render",
        label: studio.rendering ? "Rendering..." : "Render now",
        hint: blockedReason ?? "Generate an image from the current view",
        disabled: !canRender || studio.rendering,
        onSelect: studio.render,
      },
      {
        id: "inspect",
        label: "See what the AI gets",
        hint: "Inspect the control maps before spending a render",
        disabled: !studio.captureReady,
        onSelect: () => setPasses(studio.capturePreview()),
      },
    ],
  };

  // Cards paint in focus order, so a raised card sits above its neighbours.
  const sortedItems = useMemo(() => {
    const rank = (id: string) => order.indexOf(id);
    return [...studio.scene.items].sort((a, b) => rank(a.id) - rank(b.id));
  }, [studio.scene.items, order]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Board
        viewport={viewport}
        onPan={panBy}
        onZoom={zoomAt}
        onBackgroundClick={() => studio.select(null)}
      >
        {sortedItems.map((item) => (
          <ObjectCard
            key={item.id}
            cardId={item.id}
            item={item}
            position={positionFor(
              item.id,
              studio.scene.items.indexOf(item),
              0,
            )}
            zoom={viewport.zoom}
            selected={item.id === studio.scene.selectedId}
            onMove={moveCard}
            onFocus={focusCard}
            onSelect={studio.select}
            onExpand={openEditor}
            onToggleVisible={studio.toggleVisible}
            onToggleGhost={studio.toggleGhost}
            onRemove={studio.remove}
            menu={
              <CardMenu
                groups={[
                  perspectiveGroup,
                  renderGroup,
                  {
                    label: "This object",
                    actions: [
                      {
                        id: "position",
                        label: "Position in 3D",
                        hint: "Move and rotate with a gizmo",
                        onSelect: () => openEditor(item.id),
                      },
                      {
                        id: "xray",
                        label: item.ghosted ? "Turn off X-ray" : "X-ray",
                        hint: "See the parts inside the shell",
                        onSelect: () => studio.toggleGhost(item.id),
                      },
                      {
                        id: "visible",
                        label: item.visible ? "Hide from render" : "Show in render",
                        onSelect: () => studio.toggleVisible(item.id),
                      },
                      {
                        id: "duplicate",
                        label: "Duplicate",
                        hint: "Place another copy alongside",
                        onSelect: () => studio.duplicate(item.id),
                      },
                      {
                        id: "visual",
                        label: "Edit look and material",
                        hint: "Jump to the Look card",
                        onSelect: () =>
                          bringIntoView(LOOK_CARD_ID, {
                            x: COLUMN_X[1],
                            y: 80,
                          }),
                      },
                    ],
                  },
                ]}
              />
            }
          />
        ))}

        <LookCard
          position={positionFor(LOOK_CARD_ID, 0, 1)}
          zoom={viewport.zoom}
          selection={studio.selection}
          onSelectionChange={studio.setSelection}
          composedPrompt={studio.composedPrompt}
          settings={studio.settings}
          onSettingsChange={studio.setSettings}
          onRender={studio.render}
          onInspect={() => setPasses(studio.capturePreview())}
          canRender={canRender}
          rendering={studio.rendering}
          blockedReason={blockedReason}
          onMove={moveCard}
          onFocus={focusCard}
          menu={
            <CardMenu
              groups={[
                perspectiveGroup,
                renderGroup,
                {
                  label: "Look",
                  actions: [
                    {
                      id: "reset-look",
                      label: "Clear all choices",
                      hint: "Start the description and presets over",
                      onSelect: studio.resetLook,
                    },
                  ],
                },
              ]}
            />
          }
        />

        <RenderCard
          position={positionFor(RENDER_CARD_ID, 0, 2)}
          zoom={viewport.zoom}
          results={studio.results}
          rendering={studio.rendering}
          pendingCount={studio.settings.numImages}
          onOpen={setPreview}
          onMove={moveCard}
          onFocus={focusCard}
          menu={
            <CardMenu
              groups={[
                perspectiveGroup,
                {
                  label: "Render",
                  actions: [
                    {
                      id: "render-again",
                      label: studio.rendering
                        ? "Rendering..."
                        : "Render more variations",
                      hint: blockedReason ?? "Adds to the results below",
                      disabled: !canRender || studio.rendering,
                      onSelect: studio.render,
                    },
                  ],
                },
                {
                  label: "Results",
                  actions: [
                    {
                      id: "clear",
                      label: "Clear all renders",
                      disabled: studio.results.length === 0,
                      danger: true,
                      onSelect: studio.clearResults,
                    },
                  ],
                },
              ]}
            />
          }
        />
      </Board>

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
        <TopBar status={studio.status} />

        {studio.error ? (
          <div className="glass pointer-events-auto mx-auto max-w-lg rounded-xl border-danger/40 px-3 py-2">
            <p className="text-[11.5px] leading-snug text-danger">
              {studio.error}
            </p>
            <button
              type="button"
              onClick={() => studio.setError(null)}
              className="mt-1 text-[10px] text-faint underline transition-colors hover:text-text"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <BoardToolbar
          loadingModel={studio.loadingModel}
          loadingComponentId={studio.loadingComponentId}
          libraryOpen={libraryOpen}
          zoom={viewport.zoom}
          canEdit={hasModel}
          onImport={studio.importProduct}
          onAddComponent={studio.addComponent}
          onToggleLibrary={() => setLibraryOpen((open) => !open)}
          onOpenEditor={() => setEditorOpen(true)}
          onZoom={(factor) =>
            zoomAt(factor, {
              x: window.innerWidth / 2,
              y: window.innerHeight / 2,
            })
          }
        />
      </div>

      {editorOpen ? (
        <SceneEditor
          scene={studio.scene}
          transformMode={studio.transformMode}
          framingRequest={studio.framingRequest}
          onSelect={studio.select}
          onTransform={studio.applyTransform}
          onCameraChange={studio.setCameraState}
          onModeChange={studio.setTransformMode}
          onToggleVisible={studio.toggleVisible}
          onToggleGhost={studio.toggleGhost}
          onRemove={studio.remove}
          onFrame={studio.frameView}
          onClose={() => setEditorOpen(false)}
        />
      ) : null}

      {passes ? (
        <PassInspector passes={passes} onClose={() => setPasses(null)} />
      ) : null}

      {preview ? (
        <ResultPreview
          image={preview}
          instagramReady={Boolean(studio.status?.instagramReady)}
          instagramUsername={studio.status?.instagramUsername ?? null}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </div>
  );
}
