"use client";

import { useCallback, useMemo, useState } from "react";
import { useStudio } from "@/lib/scene/useStudio";
import { isRenderable, EMPTY_SELECTION } from "@/lib/presets/composePrompt";
import { createId } from "@/lib/scene/sceneItem";
import {
  CARD_HEIGHT,
  screenToBoard,
  zoomViewport,
  type BoardViewport,
  type Point,
} from "@/lib/board/boardState";
import type { Connection, Rect } from "@/lib/board/connections";
import type { CapturePasses, RenderedImage } from "@/lib/types";
import { Board } from "@/components/board/Board";
import { Connectors } from "@/components/board/Connectors";
import { ObjectCard } from "@/components/board/ObjectCard";
import { DescribeCard } from "@/components/board/DescribeCard";
import { StyleCard } from "@/components/board/StyleCard";
import { RenderSetupCard } from "@/components/board/RenderSetupCard";
import { RenderCard } from "@/components/board/RenderCard";
import { CardMenu, type CardActionGroup } from "@/components/board/CardMenu";
import { NoteCard } from "@/components/board/NoteCard";
import { DeletePill } from "@/components/board/DeletePill";
import {
  createNote,
  removeNote,
  updateNote,
  type Note,
} from "@/lib/board/notes";
import { VIEW_LABELS, type ViewDirection } from "@/lib/three/framing";
import { SideRail } from "./SideRail";
import { TutorialPanel, type TutorialStep } from "./TutorialPanel";
import { IdleAssistant } from "./IdleAssistant";
import { GuideCursor } from "./GuideCursor";
import { SceneEditor } from "./SceneEditor";
import { ResultPreview } from "./ResultPreview";
import { PassInspector } from "./PassInspector";

const GAP = 36;

const DESCRIBE = "describe";
const STYLE = "style";
const RENDER = "render";
const RENDERS = "renders";

/** Step cards the user can add. Order fixes their place in the chain. */
type StepId = typeof DESCRIBE | typeof STYLE | typeof RENDER;

const STEP_ORDER: readonly StepId[] = [DESCRIBE, STYLE, RENDER];

const STEP_LABELS: Record<StepId, { label: string; hint: string }> = {
  [DESCRIBE]: {
    label: "Describe it",
    hint: "Say what the product is, in plain words",
  },
  [STYLE]: {
    label: "Restyle it",
    hint: "Pick the material, the light and the background",
  },
  [RENDER]: {
    label: "Render it",
    hint: "Set the format and generate the image",
  },
};

/**
 * Column origins for the pipeline, left to right. Explicit rather than derived,
 * because the cards are deliberately different widths.
 */
const COLUMN_X = [80, 460, 880, 1340, 1760] as const;

/** Offered on every card, so the render angle is always one click away. */
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
  const [sizes, setSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [order, setOrder] = useState<readonly string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [preview, setPreview] = useState<RenderedImage | null>(null);
  const [passes, setPasses] = useState<CapturePasses | null>(null);
  /**
   * Which step cards exist. Empty to start: the board opens on an explanation
   * rather than five panels of settings for a model that is not loaded yet.
   */
  const [steps, setSteps] = useState<readonly StepId[]>([]);
  /**
   * The guide is an overlay, so it sits on top of the board. It closes itself
   * when the first step card appears - otherwise it covers the very cards it
   * just told you to make - and the rail can always bring it back.
   */
  const [guideOpen, setGuideOpen] = useState(true);
  const [notes, setNotes] = useState<readonly Note[]>([]);
  const [assistantMuted, setAssistantMuted] = useState(false);

  const hasModel = studio.scene.items.length > 0;
  const hasLook = isRenderable(studio.selection);
  const backendReady = studio.status?.backendLive !== false;
  const canRender = studio.captureReady && hasLook && backendReady;

  /** Steps present, always in pipeline order however they were added. */
  const chain = useMemo(
    () => STEP_ORDER.filter((step) => steps.includes(step)),
    [steps],
  );

  const showRenders = studio.results.length > 0 || studio.rendering;
  /** True once the user has done anything at all. */
  const hasStarted = hasModel || steps.length > 0 || notes.length > 0;

  const addStep = useCallback((step: StepId) => {
    setSteps((current) =>
      current.includes(step) ? current : [...current, step],
    );
    // Step aside for the card that is about to appear.
    setGuideOpen(false);
  }, []);

  const removeStep = useCallback((step: StepId) => {
    setSteps((current) => current.filter((item) => item !== step));
  }, []);

  const blockedReason = !studio.captureReady
    ? "Add a 3D model to the stage first."
    : !hasLook
      ? "Describe what the product is."
      : (studio.status?.backendError ?? null);

  /**
   * Resolved position of every card: the dragged position when there is one,
   * otherwise its default slot. Shared by the cards AND the connector wires,
   * so a card that has never been dragged still anchors its wires correctly.
   */
  const layout = useMemo(() => {
    const out: Record<string, Point> = {};
    const columnX = (column: number) =>
      COLUMN_X[column] ?? COLUMN_X[COLUMN_X.length - 1];

    // Object cards stack on their MEASURED heights; a fixed step made tall
    // cards overlap the one below and hide its controls.
    let stackY = 80;
    for (const item of studio.scene.items) {
      out[item.id] = positions[item.id] ?? { x: columnX(0), y: stackY };
      stackY += (sizes[item.id]?.height ?? CARD_HEIGHT) + GAP;
    }

    chain.forEach((step, index) => {
      out[step] = positions[step] ?? { x: columnX(index + 1), y: 80 };
    });
    out[RENDERS] =
      positions[RENDERS] ?? { x: columnX(chain.length + 1), y: 80 };

    return out;
  }, [positions, studio.scene.items, sizes, chain]);

  const rects = useMemo(() => {
    const out: Record<string, Rect> = {};
    for (const [id, size] of Object.entries(sizes)) {
      const position = layout[id];
      if (!position) continue;
      out[id] = { x: position.x, y: position.y, ...size };
    }
    return out;
  }, [sizes, layout]);

  /**
   * The pipeline as wires. Everything staged feeds the description, which
   * flows through style and render settings to the output. A hidden object is
   * wired but dimmed, so exclusion is visible rather than puzzling.
   */
  const connections = useMemo<readonly Connection[]>(() => {
    const nodes = [...chain, ...(showRenders ? [RENDERS] : [])];
    if (nodes.length === 0) return [];

    const wires: Connection[] = studio.scene.items.map((item) => ({
      id: `${item.id}->${nodes[0]}`,
      from: item.id,
      to: nodes[0],
      muted: !item.visible,
    }));

    for (let i = 0; i < nodes.length - 1; i += 1) {
      wires.push({
        id: `${nodes[i]}->${nodes[i + 1]}`,
        from: nodes[i],
        to: nodes[i + 1],
      });
    }
    return wires;
  }, [studio.scene.items, chain, showRenders]);

  const moveCard = useCallback((id: string, position: Point) => {
    setPositions((current) => ({ ...current, [id]: position }));
  }, []);

  const measureCard = useCallback(
    (id: string, size: { width: number; height: number }) => {
      setSizes((current) => {
        const known = current[id];
        // ResizeObserver fires on every layout pass; a fresh object each time
        // would re-render the whole board.
        if (known && known.width === size.width && known.height === size.height) {
          return current;
        }
        return { ...current, [id]: size };
      });
    },
    [],
  );

  /**
   * Places a freshly added card in the middle of the current view.
   *
   * Stacking new cards in a fixed column meant an import could land off-screen
   * once the board had been panned, which reads as nothing having happened.
   */
  const placeCentred = useCallback(
    (id: string | null, width: number, height: number) => {
      if (!id) return;
      const centre = screenToBoard(
        { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        viewport,
      );
      setPositions((current) => ({
        ...current,
        [id]: { x: centre.x - width / 2, y: centre.y - height / 2 },
      }));
    },
    [viewport],
  );

  /** Drops a note in the middle of whatever the user is currently looking at. */
  const addNote = useCallback(() => {
    const centre = screenToBoard(
      { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      viewport,
    );
    setNotes((current) => [
      ...current,
      createNote(createId("note"), { x: centre.x - 150, y: centre.y - 40 }),
    ]);
  }, [viewport]);

  const changeNote = useCallback((id: string, patch: Partial<Note>) => {
    setNotes((current) => updateNote(current, id, patch));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((current) => removeNote(current, id));
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

  const openEditor = useCallback(
    (itemId: string) => {
      studio.select(itemId);
      setEditorOpen(true);
    },
    [studio],
  );

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

  /**
   * The actions that build the pipeline. Only steps not already on the board
   * are offered, so the menu shrinks as the chain grows.
   */
  const addGroup: CardActionGroup = {
    label: "Add a step",
    actions: [
      ...STEP_ORDER.filter((step) => !steps.includes(step)).map((step) => ({
        id: `add-${step}`,
        label: STEP_LABELS[step].label,
        hint: STEP_LABELS[step].hint,
        onSelect: () => addStep(step),
      })),
      {
        id: "modify-3d",
        label: "Modify in 3D",
        hint: "Move and rotate parts with a gizmo",
        disabled: !hasModel,
        onSelect: () => setEditorOpen(true),
      },
    ],
  };

  const tutorial: readonly TutorialStep[] = useMemo(
    () => [
      {
        id: "import",
        title: "Add your 3D file",
        detail: "STL, OBJ or GLB. It keeps its real millimetre size.",
        done: hasModel,
        target: '[data-tour="add-3d"]',
      },
      {
        id: "describe",
        title: "Say what it is",
        detail: "One plain sentence. Add the Describe step from any card's +.",
        done: hasLook,
        target: '[data-tour="card-plus"]',
      },
      {
        id: "style",
        title: "Choose a look",
        detail: "Material, light and background, from presets.",
        done: Boolean(
          studio.selection.materialId ??
            studio.selection.lightingId ??
            studio.selection.sceneId,
        ),
        target: '[data-tour="card-plus"]',
      },
      {
        id: "render",
        title: "Render it",
        detail: "Generate the image, then post or download it.",
        done: studio.results.length > 0,
        target: '[data-tour="render"]',
      },
    ],
    [
      hasModel,
      hasLook,
      studio.selection.materialId,
      studio.selection.lightingId,
      studio.selection.sceneId,
      studio.results.length,
    ],
  );

  /**
   * What the assistant says. Null once everything is done or the user has
   * waved it off, so it cannot nag someone who has finished.
   */
  const nextStep = useMemo(
    () => (assistantMuted ? null : (tutorial.find((step) => !step.done) ?? null)),
    [tutorial, assistantMuted],
  );

  const assistantHint = nextStep
    ? `${nextStep.title} — ${nextStep.detail}`
    : null;

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
        <Connectors
          connections={connections}
          rects={rects}
          active={studio.rendering}
        />

        {sortedItems.map((item) => (
          <ObjectCard
            key={item.id}
            cardId={item.id}
            item={item}
            position={layout[item.id] ?? { x: COLUMN_X[0], y: 80 }}
            zoom={viewport.zoom}
            selected={item.id === studio.scene.selectedId}
            onMove={moveCard}
            onFocus={focusCard}
            onSelect={studio.select}
            onExpand={openEditor}
            onToggleVisible={studio.toggleVisible}
            onUnitChange={studio.setItemUnit}
            onMeasure={measureCard}
            menu={
              <CardMenu
                groups={[
                  addGroup,
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
                        id: "visible",
                        label: item.visible
                          ? "Hide from render"
                          : "Show in render",
                        onSelect: () => studio.toggleVisible(item.id),
                      },
                      {
                        id: "duplicate",
                        label: "Duplicate",
                        hint: "Place another copy alongside",
                        onSelect: () => studio.duplicate(item.id),
                      },
                    ],
                  },
                ]}
              />
            }
            deleteMenu={
              <DeletePill
                actions={[
                  {
                    id: "remove-object",
                    label:
                      item.kind === "product" ? "Delete model" : "Delete part",
                    hint: "Takes it off the stage entirely",
                    onSelect: () => studio.remove(item.id),
                  },
                ]}
              />
            }
          />
        ))}

        {steps.includes(DESCRIBE) ? (
          <DescribeCard
          position={layout[DESCRIBE] ?? { x: COLUMN_X[1], y: 80 }}
          zoom={viewport.zoom}
          selection={studio.selection}
          onChange={studio.setSelection}
          composedPrompt={studio.composedPrompt}
          onMove={moveCard}
          onFocus={focusCard}
          onMeasure={measureCard}
            menu={
              <CardMenu
                groups={[
                  addGroup,
                  renderGroup,
                  {
                    label: "This step",
                    actions: [
                      {
                        id: "clear-subject",
                        label: "Clear the description",
                        onSelect: () =>
                          studio.setSelection({
                            ...studio.selection,
                            subject: "",
                            extra: "",
                          }),
                      },
                    ],
                  },
                ]}
              />
            }
            deleteMenu={
              <DeletePill
                actions={[
                  {
                    id: "remove-describe",
                    label: "Delete step",
                    hint: "Takes this step off the board",
                    onSelect: () => removeStep(DESCRIBE),
                  },
                ]}
              />
            }
          />
        ) : null}

        {steps.includes(STYLE) ? (
          <StyleCard
          position={layout[STYLE] ?? { x: COLUMN_X[2], y: 80 }}
          zoom={viewport.zoom}
          selection={studio.selection}
          onChange={studio.setSelection}
          onMove={moveCard}
          onFocus={focusCard}
          onMeasure={measureCard}
            menu={
              <CardMenu
                groups={[
                  addGroup,
                  renderGroup,
                  {
                    label: "This step",
                    actions: [
                      {
                        id: "clear-style",
                        label: "Clear material, light and background",
                        onSelect: () =>
                          studio.setSelection({
                            ...studio.selection,
                            materialId: null,
                            lightingId: null,
                            sceneId: null,
                          }),
                      },
                      {
                        id: "reset-all",
                        label: "Start the look over",
                        onSelect: () => studio.setSelection(EMPTY_SELECTION),
                      },
                    ],
                  },
                ]}
              />
            }
            deleteMenu={
              <DeletePill
                actions={[
                  {
                    id: "remove-style",
                    label: "Delete step",
                    hint: "Takes this step off the board",
                    onSelect: () => removeStep(STYLE),
                  },
                ]}
              />
            }
          />
        ) : null}

        {steps.includes(RENDER) ? (
          <RenderSetupCard
          position={layout[RENDER] ?? { x: COLUMN_X[3], y: 80 }}
          zoom={viewport.zoom}
          settings={studio.settings}
          onChange={studio.setSettings}
          onRender={studio.render}
          onInspect={() => setPasses(studio.capturePreview())}
          canRender={canRender}
          rendering={studio.rendering}
          blockedReason={blockedReason}
          onMove={moveCard}
          onFocus={focusCard}
          onMeasure={measureCard}
            menu={
              <CardMenu
                groups={[
                  addGroup,
                  perspectiveGroup,
                  renderGroup,
                ]}
              />
            }
            deleteMenu={
              <DeletePill
                actions={[
                  {
                    id: "remove-render",
                    label: "Delete step",
                    hint: "Takes this step off the board",
                    onSelect: () => removeStep(RENDER),
                  },
                ]}
              />
            }
          />
        ) : null}

        {showRenders ? (
          <RenderCard
          position={layout[RENDERS] ?? { x: COLUMN_X[4], y: 80 }}
          zoom={viewport.zoom}
          results={studio.results}
          rendering={studio.rendering}
          pendingCount={studio.settings.numImages}
          onOpen={setPreview}
          onMove={moveCard}
          onFocus={focusCard}
          onMeasure={measureCard}
            menu={
              <CardMenu
                groups={[
                  addGroup,
                  renderGroup,
                ]}
              />
            }
            deleteMenu={
              <DeletePill
                actions={[
                  {
                    id: "clear",
                    label: "Clear all renders",
                    hint: "Empties the results; the images stay on the CDN",
                    disabled: studio.results.length === 0,
                    onSelect: studio.clearResults,
                  },
                ]}
              />
            }
          />
        ) : null}
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            zoom={viewport.zoom}
            onChange={changeNote}
            onRemove={deleteNote}
            onFocus={focusCard}
          />
        ))}
      </Board>

      <div className="pointer-events-none absolute inset-0 p-3">
        <SideRail
          status={studio.status}
          loadingModel={studio.loadingModel}
          loadingComponentId={studio.loadingComponentId}
          libraryOpen={libraryOpen}
          zoom={viewport.zoom}
          canEdit={hasModel}
          onImport={async (file) => {
            const id = await studio.importProduct(file, "mm");
            placeCentred(id, 320, 430);
          }}
          onAddComponent={async (spec, params) => {
            const id = await studio.addComponent(spec, params);
            placeCentred(id, 320, 430);
          }}
          onToggleLibrary={() => setLibraryOpen((open) => !open)}
          onOpenEditor={() => setEditorOpen(true)}
          onZoom={(factor) =>
            zoomAt(factor, {
              x: window.innerWidth / 2,
              y: window.innerHeight / 2,
            })
          }
          onAddNote={addNote}
          guideOpen={guideOpen}
          onToggleGuide={() => setGuideOpen((open) => !open)}
        />

        {guideOpen ? (
          /*
           * Centred on an empty board, where it is the only thing to read, then
           * it slides aside once there is work behind it. Animating left/top
           * rather than swapping anchors keeps the move continuous.
           */
          <div
            className="pointer-events-none absolute"
            style={{
              left: hasStarted ? "calc(100% - 392px)" : "50%",
              top: hasStarted ? "12px" : "50%",
              transform: hasStarted
                ? "translate(0, 0)"
                : "translate(-50%, -50%)",
              transition:
                "left 520ms cubic-bezier(0.4, 0, 0.2, 1), top 520ms cubic-bezier(0.4, 0, 0.2, 1), transform 520ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <TutorialPanel steps={tutorial} onDismiss={() => setGuideOpen(false)} />
          </div>
        ) : null}

        {/* Keyed on the hint so a new step re-arms the idle delay instead of
            the assistant popping straight back up. */}
        <IdleAssistant
          key={assistantHint ?? "none"}
          hint={assistantHint}
          targetSelector={nextStep?.target ?? null}
          onDismiss={() => setAssistantMuted(true)}
        />

        {/* After further stillness, a ghost pointer walks to the control and
            taps it. A page cannot move the real cursor, so this demonstrates
            the move instead. */}
        <GuideCursor targetSelector={nextStep?.target ?? null} />

        {studio.error ? (
          <div className="glass backdrop-blur-2xl backdrop-saturate-150 pointer-events-auto absolute bottom-4 left-1/2 max-w-lg -translate-x-1/2 rounded-xl border-danger/40 px-4 py-3">
            <p className="text-[14px] leading-snug text-danger">{studio.error}</p>
            <button
              type="button"
              onClick={() => studio.setError(null)}
              className="mt-1 text-[13px] text-faint underline transition-colors hover:text-text"
            >
              Dismiss
            </button>
          </div>
        ) : null}
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
