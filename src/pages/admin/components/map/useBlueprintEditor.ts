import React, { useEffect, useRef, useState } from 'react';
import {
  BlueprintTransform,
  DEFAULT_BLUEPRINT_TRANSFORM,
  clearBlueprint,
  getBlueprintTransform,
  getStoredBlueprintUrl,
  saveBlueprint,
} from '../../../../services/locationStore';
import { useToast } from '../../../../hooks/useToast';
import { clampOffset, clampScale, downscaleImageFile } from './blueprintUtils';

/**
 * Blueprint upload + adjust-mode state for the campus map editor: staging a
 * new image, pan/zoom drafting, save/remove, and the file input ref.
 */
export function useBlueprintEditor() {
  const toast = useToast();

  const [blueprintUrl, setBlueprintUrl] = useState<string | null>(getStoredBlueprintUrl);
  const [blueprintTransform, setBlueprintTransform] =
    useState<BlueprintTransform>(getBlueprintTransform);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [draftTransform, setDraftTransform] = useState<BlueprintTransform>({
    ...DEFAULT_BLUEPRINT_TRANSFORM,
  });
  const [isSavingBlueprint, setIsSavingBlueprint] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const adjustDragRef = useRef<{ x: number; y: number } | null>(null);
  const outerCanvasRef = useRef<HTMLDivElement>(null);

  const displayUrl = isAdjusting ? pendingUrl : blueprintUrl;
  const displayTransform = isAdjusting ? draftTransform : blueprintTransform;

  const stageBlueprint = (dataUrl: string) => {
    setPendingUrl(dataUrl);
    setDraftTransform({ ...DEFAULT_BLUEPRINT_TRANSFORM });
    setIsAdjusting(true);
    toast.info('Adjust the blueprint, then click Save.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image blueprint (PNG, JPG, SVG, WebP)');
      return;
    }

    downscaleImageFile(file)
      .then(stageBlueprint)
      .catch(() => toast.error('Could not read that image. Please try another file.'));
  };

  const handleAdjustExisting = () => {
    if (!blueprintUrl) return;
    setPendingUrl(blueprintUrl);
    setDraftTransform({ ...blueprintTransform });
    setIsAdjusting(true);
  };

  const handleCancelAdjust = () => {
    setIsAdjusting(false);
    setPendingUrl(null);
    setDraftTransform({ ...DEFAULT_BLUEPRINT_TRANSFORM });
  };

  const handleSaveBlueprint = () => {
    if (!pendingUrl) return;
    setIsSavingBlueprint(true);
    saveBlueprint(pendingUrl, draftTransform);
    setBlueprintUrl(pendingUrl);
    setBlueprintTransform(draftTransform);
    setIsSavingBlueprint(false);
    setIsAdjusting(false);
    setPendingUrl(null);
    toast.success('Blueprint saved and applied to all maps.');
  };

  const handleRemoveBlueprint = () => {
    clearBlueprint();
    setBlueprintUrl(null);
    setBlueprintTransform({ ...DEFAULT_BLUEPRINT_TRANSFORM });
    setIsAdjusting(false);
    setPendingUrl(null);
    toast.info('Blueprint removed. Showing the default grid.');
  };

  // ── Adjust-mode interaction (pan + wheel zoom) ────────────────────────
  const handleAdjustPointerDown = (e: React.PointerEvent) => {
    if (!isAdjusting) return;
    adjustDragRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  const handleAdjustPointerMove = (e: React.PointerEvent, container: HTMLElement | null) => {
    if (!isAdjusting || !adjustDragRef.current || !container) return;
    const rect = container.getBoundingClientRect();
    const dx = ((e.clientX - adjustDragRef.current.x) / rect.width) * 100;
    const dy = ((e.clientY - adjustDragRef.current.y) / rect.height) * 100;
    adjustDragRef.current = { x: e.clientX, y: e.clientY };
    setDraftTransform((t) => ({
      ...t,
      offsetX: clampOffset(t.offsetX + dx),
      offsetY: clampOffset(t.offsetY + dy),
    }));
  };

  const handleAdjustPointerUp = () => {
    adjustDragRef.current = null;
  };

  useEffect(() => {
    if (!isAdjusting) return;
    // Listen on the full canvas (not the fitted content box) so wheel-to-zoom
    // works over the letterbox margins too.
    const el = outerCanvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setDraftTransform((t) => ({ ...t, scale: clampScale(t.scale * (1 - e.deltaY * 0.001)) }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isAdjusting]);

  return {
    blueprintUrl,
    isAdjusting,
    isSavingBlueprint,
    draftTransform,
    displayUrl,
    displayTransform,
    fileInputRef,
    outerCanvasRef,
    setDraftTransform,
    handleFileUpload,
    handleAdjustExisting,
    handleCancelAdjust,
    handleSaveBlueprint,
    handleRemoveBlueprint,
    handleAdjustPointerDown,
    handleAdjustPointerMove,
    handleAdjustPointerUp,
  };
}
