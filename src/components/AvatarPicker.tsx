"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { Camera, LoaderCircle, X } from "lucide-react";
import ProfileAvatar from "./ProfileAvatar";
interface SourceImage {
  url: string;
  width: number;
  height: number;
}
export default function AvatarPicker({
  src,
  name,
  disabled,
  onChange,
  onRemove,
  onGoogle,
  canUseGoogle,
}: {
  src: string | null;
  name: string;
  disabled: boolean;
  onChange: (file: File) => void;
  onRemove: () => void;
  onGoogle: () => void;
  canUseGoogle: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<SourceImage | null>(null);
  const [zoom, setZoom] = useState(1);
  const [horizontal, setHorizontal] = useState(50);
  const [vertical, setVertical] = useState(50);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(
    () => () => {
      if (source) URL.revokeObjectURL(source.url);
    },
    [source],
  );
  async function choose(file?: File) {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose a photo smaller than 5 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.src = url;
    try {
      await image.decode();
      if (
        !image.naturalWidth ||
        image.naturalWidth * image.naturalHeight > 36000000
      )
        throw new Error();
      setZoom(1);
      setHorizontal(50);
      setVertical(50);
      setSource({
        url,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    } catch {
      URL.revokeObjectURL(url);
      setError(
        "This image couldn’t be opened. Try another photo under 36 megapixels.",
      );
    }
  }
  async function crop() {
    if (!source || busy) return;
    setBusy(true);
    setError("");
    try {
      const image = new window.Image();
      image.src = source.url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) throw new Error();
      const scale = Math.max(512 / source.width, 512 / source.height) * zoom;
      context.drawImage(
        image,
        ((512 - source.width * scale) * horizontal) / 100,
        ((512 - source.height * scale) * vertical) / 100,
        source.width * scale,
        source.height * scale,
      );
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.88),
      );
      if (!blob) throw new Error();
      onChange(new File([blob], "profile-photo.webp", { type: "image/webp" }));
      setSource(null);
    } catch {
      setError("We couldn’t crop this photo. Try another image.");
    } finally {
      setBusy(false);
    }
  }
  const previewScale = source
    ? Math.max(1 / source.width, 1 / source.height) * zoom
    : 1;
  return (
    <div>
      <div className="profile-photo-control">
        <ProfileAvatar src={src} name={name} size={72} />
        <div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={disabled}
              onClick={() => input.current?.click()}
            >
              <Camera size={15} aria-hidden="true" />
              Change photo
            </button>
            {src && (
              <button
                type="button"
                className="profile-quiet-button"
                disabled={disabled}
                onClick={onRemove}
              >
                Remove
              </button>
            )}
          </div>
          <p className="profile-helper mt-2">JPG, PNG, or WebP. Up to 5 MB.</p>
          {canUseGoogle && (
            <button
              type="button"
              disabled={disabled}
              className="profile-inline-button"
              onClick={onGoogle}
            >
              Use Google photo
            </button>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Choose profile photo"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          void choose(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {error && (
        <p className="profile-field-error" role="alert">
          {error}
        </p>
      )}
      <Dialog.Root
        open={!!source}
        onOpenChange={(open) => {
          if (!open && !busy) setSource(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/60" />
          <Dialog.Content className="photo-crop-dialog">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-xl font-medium">
                Adjust your photo
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="icon-button"
                  disabled={busy}
                  aria-label="Close photo editor"
                >
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="profile-helper">
              Zoom and position your photo inside the frame.
            </Dialog.Description>
            <div className="photo-crop-frame">
              {source && (
                <Image
                  src={source.url}
                  alt="Profile photo crop preview"
                  unoptimized
                  width={source.width}
                  height={source.height}
                  style={{
                    width: `${source.width * previewScale * 100}%`,
                    height: `${source.height * previewScale * 100}%`,
                    maxWidth: "none",
                    left: `${(1 - source.width * previewScale) * horizontal}%`,
                    top: `${(1 - source.height * previewScale) * vertical}%`,
                  }}
                />
              )}
            </div>
            {[
              {
                label: "Zoom",
                value: zoom,
                min: 1,
                max: 3,
                step: 0.05,
                update: setZoom,
              },
              {
                label: "Horizontal position",
                value: horizontal,
                min: 0,
                max: 100,
                step: 1,
                update: setHorizontal,
              },
              {
                label: "Vertical position",
                value: vertical,
                min: 0,
                max: 100,
                step: 1,
                update: setVertical,
              },
            ].map((control) => (
              <label key={control.label} className="photo-crop-slider">
                {control.label}
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={control.value}
                  disabled={busy}
                  onChange={(event) =>
                    control.update(Number(event.target.value))
                  }
                />
              </label>
            ))}
            {error && (
              <p className="profile-field-error" role="alert">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button type="button" className="btn-secondary" disabled={busy}>
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                className="btn-primary"
                disabled={busy}
                onClick={crop}
              >
                {busy ? (
                  <LoaderCircle
                    size={15}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : null}
                Use photo
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
