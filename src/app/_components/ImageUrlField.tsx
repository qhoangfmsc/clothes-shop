"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, ImageOff, Eye } from "lucide-react";
import { useToast } from "./Toast";
import { uploadMediaFile } from "@/src/hooks/use-media-upload";
import { inputClass } from "./AdminFormKit";
import { ImagePreviewLightbox } from "./ImagePreviewLightbox";

/** A single image-URL input that also accepts a direct upload — the
 *  upload goes to the s3host Appwrite bucket and fills the field with
 *  the resulting public URL. Used by Categories (hero image) and
 *  Collections (cover image). */
export function ImageUrlField({
  value,
  onChange,
  placeholder = "https://... or upload a file",
}: {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleFile = async (file: File) => {
    setIsUploading(true);
    try {
      const uploaded = await uploadMediaFile(file);
      onChange(uploaded.url);
      setPreviewFailed(false);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          className={`${inputClass} flex-1`}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setPreviewFailed(false);
          }}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[var(--bg-elevated)] border-0 rounded-sm text-xs font-primary text-[var(--text-secondary)] cursor-pointer disabled:opacity-50 shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {value && (
        <div
          className={`relative w-20 h-20 rounded-sm overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center justify-center group ${
            previewFailed ? "" : "cursor-pointer"
          }`}
          onClick={() => !previewFailed && setShowPreview(true)}
        >
          {previewFailed ? (
            <ImageOff size={18} className="text-[var(--text-disabled)]" />
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-entered URL, not an optimizable next/image domain */}
              <img
                src={value}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setPreviewFailed(true)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-colors flex items-center justify-center">
                <Eye
                  size={16}
                  className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>
            </>
          )}
        </div>
      )}

      {value && !previewFailed && (
        <ImagePreviewLightbox open={showPreview} onClose={() => setShowPreview(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-entered URL, not an optimizable next/image domain */}
          <img src={value} alt="" className="max-w-[90vw] max-h-[85vh] object-contain rounded-md" />
        </ImagePreviewLightbox>
      )}
    </div>
  );
}
