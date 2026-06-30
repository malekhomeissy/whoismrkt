import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { X, ZoomIn, ZoomOut } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Canvas crop helper
// ─────────────────────────────────────────────────────────────

async function cropImageToBlob(src: string, pixelCrop: Area, outputSize = 480): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => {
    img.onload  = () => res();
    img.onerror = rej;
    img.src = src;
  });

  const canvas = document.createElement("canvas");
  canvas.width  = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    img,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0,
    outputSize, outputSize,
  );

  return new Promise((res, rej) =>
    canvas.toBlob(b => b ? res(b) : rej(new Error("empty")), "image/jpeg", 0.93)
  );
}

// ─────────────────────────────────────────────────────────────
// Modal component
// ─────────────────────────────────────────────────────────────

export interface AvatarCropModalProps {
  imageSrc: string;
  shape?: "round" | "rect";
  title?: string;
  onSave: (blob: Blob, previewDataUrl: string) => void;
  onCancel: () => void;
}

export function AvatarCropModal({
  imageSrc,
  shape = "round",
  title,
  onSave,
  onCancel,
}: AvatarCropModalProps) {
  const [crop,              setCrop]              = useState<Point>({ x: 0, y: 0 });
  const [zoom,              setZoom]              = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving,            setSaving]            = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleSave() {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await cropImageToBlob(imageSrc, croppedAreaPixels);
      const dataUrl = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target?.result as string);
        reader.readAsDataURL(blob);
      });
      onSave(blob, dataUrl);
    } catch (e) {
      console.error("[AvatarCropModal] crop failed:", e);
    } finally {
      setSaving(false);
    }
  }

  const heading = title ?? (shape === "round" ? "Adjust Profile Photo" : "Adjust Logo");

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "oklch(0 0 0 / 80%)",
        backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <div style={{
        background: "oklch(0.10 0 0)",
        border: "1px solid oklch(1 0 0 / 12%)",
        borderRadius: 22,
        width: "min(460px, 100%)",
        overflow: "hidden",
        boxShadow: "0 40px 100px oklch(0 0 0 / 70%), inset 0 1px 0 oklch(1 0 0 / 8%)",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid oklch(1 0 0 / 8%)",
        }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "oklch(1 0 0 / 92%)" }}>
            {heading}
          </span>
          <button
            onClick={onCancel}
            style={{
              background: "oklch(1 0 0 / 8%)", border: "none", cursor: "pointer",
              width: 28, height: 28, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "oklch(1 0 0 / 46%)",
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Cropper */}
        <div style={{ position: "relative", height: 300, background: "#000" }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape={shape}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { background: "#000" },
              cropAreaStyle: {
                border: "2.5px solid oklch(0.84 0 0)",
                boxShadow: "0 0 0 9999px oklch(0 0 0 / 52%)",
              },
            }}
          />
        </div>

        {/* Hint */}
        <div style={{ padding: "10px 24px 0", textAlign: "center", fontSize: 11, color: "oklch(1 0 0 / 32%)" }}>
          Pinch or drag to adjust
        </div>

        {/* Zoom slider */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 24px",
        }}>
          <button
            onClick={() => setZoom(z => Math.max(1, +(z - 0.1).toFixed(2)))}
            style={{ background: "none", border: "none", cursor: "pointer", color: "oklch(1 0 0 / 40%)", padding: 0, display: "flex" }}
          >
            <ZoomOut style={{ width: 16, height: 16 }} />
          </button>
          <input
            type="range"
            min={1} max={3} step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: "oklch(0.72 0.10 224)", cursor: "pointer", height: 3 }}
          />
          <button
            onClick={() => setZoom(z => Math.min(3, +(z + 0.1).toFixed(2)))}
            style={{ background: "none", border: "none", cursor: "pointer", color: "oklch(1 0 0 / 40%)", padding: 0, display: "flex" }}
          >
            <ZoomIn style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, padding: "8px 20px 20px" }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: "12px 0", borderRadius: 11,
              background: "oklch(1 0 0 / 7%)", border: "1px solid oklch(1 0 0 / 10%)",
              color: "oklch(1 0 0 / 68%)", fontSize: 14, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
            style={{
              flex: 2, padding: "12px 0", borderRadius: 11,
              border: "none", fontSize: 14,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Use Photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
