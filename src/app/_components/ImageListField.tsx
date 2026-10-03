"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Plus, X, Eye, Loader2 } from "lucide-react";
import { useToast } from "./Toast";
import { uploadMediaFile } from "@/src/hooks/use-media-upload";
import { inputClass } from "./AdminFormKit";
import { ImagePreviewLightbox } from "./ImagePreviewLightbox";

/** A grid of image URLs with an upload tile (same "+" affordance as the
 *  Media library) plus a manual "paste a URL" fallback. Used by Products'
 *  multi-image field — the first image is the main thumbnail. */
export function ImageListField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFiles = async (files: FileList) => {
    setIsUploading(true);
    try {
      const uploaded = await Promise.all(Array.from(files).map((f) => uploadMediaFile(f)));
      onChange([...value, ...uploaded.map((u) => u.url)]);
      toast.success(`${uploaded.length} image${uploaded.length !== 1 ? "s" : ""} uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    onChange([...value, trimmed]);
    setUrlInput("");
  };

  const handleUrlKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addUrl();
    }
  };

  const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2">
        {value.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="relative aspect-square rounded-sm overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-secondary)] group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-entered/uploaded URL */}
            <img
              src={url}
              alt=""
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setPreviewUrl(url)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors pointer-events-none flex items-center justify-center">
              <Eye
                size={14}
                className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
            {i === 0 && (
              <span className="absolute bottom-1 left-1 text-[9px] font-semibold bg-black/60 text-white py-0.5 px-1.5 rounded-sm">
                Main
              </span>
            )}
            <button
              type="button"
              className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 rounded-full bg-black/60 text-white border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeAt(i)}
              title="Remove"
            >
              <X size={11} />
            </button>
          </div>
        ))}

        <button
          type="button"
          className="aspect-square rounded-sm border border-dashed border-[var(--border-light)] bg-transparent flex items-center justify-center cursor-pointer text-[var(--text-disabled)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] transition-colors disabled:opacity-50"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="Upload image"
        >
          {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={20} />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex gap-2">
        <input
          className={`${inputClass} flex-1`}
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={handleUrlKeyDown}
          placeholder="Paste an image URL and press Enter"
        />
        <button
          type="button"
          className="py-2 px-3 bg-[var(--bg-elevated)] border-0 rounded-sm text-xs font-primary text-[var(--text-secondary)] cursor-pointer shrink-0"
          onClick={addUrl}
        >
          Add URL
        </button>
      </div>

      <ImagePreviewLightbox open={!!previewUrl} onClose={() => setPreviewUrl(null)}>
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-entered/uploaded URL
          <img
            src={previewUrl}
            alt=""
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-md"
          />
        )}
      </ImagePreviewLightbox>
    </div>
  );
}
