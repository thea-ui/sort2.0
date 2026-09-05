import { useState, useRef, useEffect, useCallback } from 'react';

interface UseLiveCameraOptions {
  onCapture?: (dataUrl: string) => void;
}

export function useLiveCamera({ onCapture }: UseLiveCameraOptions = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isLiveCameraActive, setIsLiveCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsLiveCameraActive(false);
    setCameraError(null);
  }, [cameraStream]);

  const startCamera = useCallback(async (facing: 'user' | 'environment' = facingMode) => {
    setCameraError(null);
    setIsLiveCameraActive(true);

    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }

    try {
      let mediaStream: MediaStream;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }
          });
        } catch {
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        setCameraStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      } else {
        throw new Error('MediaDevices API not supported on this browser');
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Camera access not supported or permission denied. Please use file upload.');
    }
  }, [facingMode, cameraStream]);

  const snapPhoto = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      onCapture?.(dataUrl);
    }
    stopCamera();
  }, [onCapture, stopCamera]);

  const toggleCameraFacing = useCallback(() => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  }, [facingMode, startCamera]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  return {
    videoRef,
    canvasRef,
    isLiveCameraActive,
    cameraError,
    facingMode,
    startCamera,
    stopCamera,
    snapPhoto,
    toggleCameraFacing,
  };
}
