"use client";

import { Camera, ImageUp, RotateCcw, ScanText, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ALLOWED_IMAGE_TYPES,
  validateWorksheetImageFile,
  type OcrErrorBody
} from "@/lib/ocr/schema";
import type { WorksheetUploadStatus } from "@/components/child/ChildSessionContext";

type OcrUploadResult = {
  sessionId: string;
  text: string;
  imageKeywords: string[];
};

type WorksheetCaptureProps = {
  status: WorksheetUploadStatus;
  onStatusChange: (status: WorksheetUploadStatus) => void;
  ensureSession: () => Promise<string>;
  onOcrComplete: (result: OcrUploadResult) => void;
};

const acceptTypes = ALLOWED_IMAGE_TYPES.join(",");

export function WorksheetCapture({
  status,
  onStatusChange,
  ensureSession,
  onOcrComplete
}: WorksheetCaptureProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    setStream((currentStream) => {
      currentStream?.getTracks().forEach((track) => track.stop());
      return null;
    });
  }, []);

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const setPreviewFile = useCallback(
    (file: File) => {
      revokePreviewUrl();
      const nextUrl = URL.createObjectURL(file);

      previewUrlRef.current = nextUrl;
      setSelectedFile(file);
      setPreviewUrl(nextUrl);
      setMessage(null);
      onStatusChange("image_selected");
    },
    [onStatusChange, revokePreviewUrl]
  );

  const clearSelectedImage = useCallback(() => {
    revokePreviewUrl();
    setSelectedFile(null);
    setPreviewUrl(null);
    setMessage(null);
    onStatusChange("idle");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [onStatusChange, revokePreviewUrl]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      revokePreviewUrl();
      stopCamera();
    };
  }, [revokePreviewUrl, stopCamera]);

  const handleChooseFile = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    const validationError = validateWorksheetImageFile(file);

    stopCamera();

    if (validationError || !file) {
      setMessage(validationError?.message ?? "Please choose a worksheet photo first.");
      onStatusChange("error");
      return;
    }

    setPreviewFile(file);
  };

  const handleStartCamera = async () => {
    setMessage(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Camera preview is not available here. You can still choose a photo.");
      onStatusChange("error");
      return;
    }

    onStatusChange("requesting_camera");

    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" }
        }
      });

      revokePreviewUrl();
      setSelectedFile(null);
      setPreviewUrl(null);
      setStream(cameraStream);
      onStatusChange("camera_ready");
    } catch (error) {
      console.error("Camera permission or startup failed.", error);
      setMessage("Camera permission was blocked. You can still choose a photo.");
      onStatusChange("error");
    }
  };

  const handleCaptureFrame = () => {
    const video = videoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setMessage("The camera is still waking up. Please try again.");
      onStatusChange("error");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setMessage("We could not take that photo. Please try again.");
          onStatusChange("error");
          return;
        }

        const file = new File([blob], "worksheet-photo.jpg", { type: "image/jpeg" });
        const validationError = validateWorksheetImageFile(file);

        if (validationError) {
          setMessage(validationError.message);
          onStatusChange("error");
          return;
        }

        stopCamera();
        setPreviewFile(file);
      },
      "image/jpeg",
      0.92
    );
  };

  const handleUpload = async () => {
    if (!selectedFile || status === "uploading") {
      return;
    }

    const validationError = validateWorksheetImageFile(selectedFile);

    if (validationError) {
      setMessage(validationError.message);
      onStatusChange("error");
      return;
    }

    onStatusChange("uploading");
    setMessage(null);

    try {
      const sessionId = await ensureSession();
      const formData = new FormData();
      formData.set("sessionId", sessionId);
      formData.set("file", selectedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const errorPayload = payload as OcrErrorBody | null;
        throw new Error(errorPayload?.error.message ?? "We could not scan that worksheet.");
      }

      const data = payload?.data as OcrUploadResult | undefined;

      if (!data?.sessionId || typeof data.text !== "string" || !Array.isArray(data.imageKeywords)) {
        throw new Error("We could not scan that worksheet.");
      }

      revokePreviewUrl();
      setSelectedFile(null);
      setPreviewUrl(null);
      onStatusChange("ocr_complete");
      onOcrComplete(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not scan that worksheet.");
      onStatusChange("error");
    }
  };

  const isUploading = status === "uploading";
  const showCamera = Boolean(stream);

  return (
    <section className="rounded-[var(--radius-card)] border border-coral/25 bg-white/90 p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-navy">Scan your worksheet</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Take a clear photo, then I will turn it into reading text.
          </p>
        </div>
        <span className="rounded-full border border-teal/25 bg-teal/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-teal">
          {status.replace(/_/g, " ")}
        </span>
      </div>

      <input
        ref={inputRef}
        id="worksheet-image"
        type="file"
        accept={acceptTypes}
        capture="environment"
        className="sr-only"
        onChange={handleFileChange}
      />

      <div className="mt-5 overflow-hidden rounded-[var(--radius-card)] border border-coral/20 bg-cream">
        {showCamera ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="aspect-[4/3] w-full bg-navy object-cover"
            aria-label="Camera preview"
          />
        ) : previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Selected worksheet preview"
            className="aspect-[4/3] w-full bg-white object-contain"
          />
        ) : (
          <div className="grid aspect-[4/3] place-items-center p-6 text-center">
            <div>
              <div className="mx-auto grid size-14 place-items-center rounded-[var(--radius-card)] bg-coral/12 text-coral">
                <ScanText aria-hidden="true" className="size-8" />
              </div>
              <p className="mt-4 text-base font-black text-navy">Your worksheet photo will show here.</p>
              <p className="mt-2 text-sm leading-6 text-muted">JPEG, PNG, or WebP up to 10 MB.</p>
            </div>
          </div>
        )}
      </div>

      {message ? (
        <p role="alert" className="mt-4 rounded-[var(--radius-card)] border border-coral/25 bg-coral/10 px-4 py-3 text-sm font-extrabold leading-6 text-navy">
          {message}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleStartCamera}
          disabled={isUploading}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-card)] border border-coral/30 px-4 py-3 text-sm font-black text-coral transition hover:bg-coral/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Camera aria-hidden="true" className="size-5" />
          Open camera
        </button>
        <button
          type="button"
          onClick={handleChooseFile}
          disabled={isUploading}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-card)] border border-teal/30 px-4 py-3 text-sm font-black text-teal transition hover:bg-teal/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ImageUp aria-hidden="true" className="size-5" />
          Choose photo
        </button>
      </div>

      {showCamera ? (
        <button
          type="button"
          onClick={handleCaptureFrame}
          className="mt-3 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-card)] bg-coral px-5 py-3 text-base font-black text-white shadow-soft transition hover:bg-coral/90"
        >
          <Camera aria-hidden="true" className="size-5" />
          Take photo
        </button>
      ) : null}

      {selectedFile ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
          <button
            type="button"
            onClick={clearSelectedImage}
            disabled={isUploading}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-card)] border border-slate-200 px-4 py-3 text-sm font-black text-muted transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw aria-hidden="true" className="size-5" />
            Retake
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[var(--radius-card)] bg-navy px-5 py-3 text-base font-black text-white shadow-soft transition hover:bg-navy/92 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Upload aria-hidden="true" className="size-5" />
            {isUploading ? "Scanning..." : "Scan worksheet"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
