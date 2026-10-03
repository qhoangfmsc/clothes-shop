"use client";

import { useRef, useState } from "react";
import {
  ImageIcon,
  Trash2,
  Eye,
  Plus,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Wifi,
} from "lucide-react";
import { useToast } from "@/src/app/_components/Toast";
import { useConfirm } from "@/src/app/_components/ConfirmDialog";
import { useAdminMedia, mediaPreviewUrl, type MediaFile } from "@/src/hooks/use-admin-media";
import { uploadMediaFile } from "@/src/hooks/use-media-upload";
import { appwriteClient } from "@/src/lib/appwrite-client";
import { ImagePreviewLightbox } from "@/src/app/_components/ImagePreviewLightbox";
import { AuthedImage } from "./_components/AuthedImage";

const PAGE_SIZE = 24;

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MediaContent() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<MediaFile | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const { files, total, isLoading, isValidating, error, mutate, deleteFile, deleteFiles } =
    useAdminMedia({ page, limit: PAGE_SIZE });

  const notConfigured = error?.code === "NOT_CONFIGURED";
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const goToPage = (next: number) => {
    setPage(next);
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleUpload = async (fileList: FileList) => {
    setIsUploading(true);
    try {
      const uploaded = await Promise.all(Array.from(fileList).map((f) => uploadMediaFile(f)));
      toast.success(`${uploaded.length} image${uploaded.length !== 1 ? "s" : ""} uploaded`);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (file: MediaFile) => {
    const ok = await confirm({
      title: "Delete image",
      message: `Delete "${file.name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteFile(file.id);
      toast.success("Image deleted");
      if (preview?.id === file.id) setPreview(null);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete image");
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    const ok = await confirm({
      title: "Delete images",
      message: `Delete ${ids.length} image${ids.length !== 1 ? "s" : ""}? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    const { succeeded, failed } = await deleteFiles(ids);
    if (succeeded > 0) toast.success(`${succeeded} image${succeeded !== 1 ? "s" : ""} deleted`);
    if (failed > 0) toast.error(`${failed} image${failed !== 1 ? "s" : ""} failed to delete`);
    setSelected(new Set());
  };

  const handlePing = async () => {
    setIsPinging(true);
    try {
      await appwriteClient.ping();
      toast.success("Ping OK — s3host is reachable");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ping failed — is s3host running?");
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      {/* ── Header ── */}
      <div className="shrink-0">
        <h1 className="font-display text-2xl text-[var(--text-heading)] font-normal">Media</h1>
        <p className="text-xs text-[var(--text-muted)] font-primary mt-1">
          Images stored on s3host (Appwrite Storage)
        </p>
      </div>

      {/* ── Toolbar (always visible) ── */}
      <div className="shrink-0 flex items-center justify-between py-2 px-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg">
        <div className="flex items-center gap-3">
          {selected.size > 0 ? (
            <>
              <span className="text-xs font-semibold text-[var(--text-secondary)] font-primary">
                {selected.size} / {total} selected
              </span>
              <button
                className="flex items-center justify-center w-7 h-7 border-0 rounded-sm bg-[var(--accent-rose)] text-[var(--color-noir)] cursor-pointer"
                onClick={handleBulkDelete}
                title="Delete selected"
              >
                <Trash2 size={13} />
              </button>
              <button
                className="flex items-center justify-center w-7 h-7 border-0 rounded-sm bg-[var(--bg-elevated)] text-[var(--text-secondary)] cursor-pointer"
                onClick={() => setSelected(new Set())}
                title="Cancel selection"
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <span className="text-xs font-semibold text-[var(--text-secondary)] font-primary">
              {total} image{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 py-2 px-4 bg-transparent border border-[var(--border-subtle)] rounded-lg text-sm font-primary text-[var(--text-secondary)] cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-40"
            onClick={handlePing}
            disabled={isPinging}
            title="Calls client.ping() against Appwrite (s3host) to confirm the SDK is connected"
          >
            <Wifi size={14} className={isPinging ? "animate-pulse" : ""} /> Ping Appwrite
          </button>
          <button
            className="flex items-center gap-1.5 py-2 px-4 bg-transparent border border-[var(--border-subtle)] rounded-lg text-sm font-primary text-[var(--text-secondary)] cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-40"
            onClick={() => mutate()}
            disabled={isValidating}
          >
            <RefreshCw size={14} className={isValidating ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Not configured yet ── */}
      {notConfigured && (
        <div className="flex flex-col gap-3 p-6 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-secondary)] max-w-[640px]">
          <h2 className="font-display text-lg text-[var(--text-heading)] font-normal">
            Appwrite is not configured yet
          </h2>
          <p className="text-sm text-[var(--text-muted)] font-primary leading-relaxed">
            The bucket and API key for s3host are missing. Open the{" "}
            <a
              href="http://localhost:8080"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent-primary)] underline"
            >
              Appwrite console
            </a>{" "}
            (project <code>main</code>) and follow these steps:
          </p>
          <ol className="text-sm text-[var(--text-secondary)] font-primary leading-relaxed list-decimal pl-5 space-y-1">
            <li>
              Storage → Create bucket (e.g. id/name: <code>images</code>).
            </li>
            <li>
              Project Settings → API keys → Create key, grant the Storage scope (read + write).
            </li>
            <li>
              Fill in <code>APPWRITE_BUCKET_ID</code> and <code>APPWRITE_API_KEY</code> in{" "}
              <code>.env.local</code>, then restart <code>npm run dev</code>.
            </li>
          </ol>
          <button
            className="self-start mt-1 flex items-center gap-1.5 py-2 px-4 bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-lg text-sm font-semibold font-primary cursor-pointer"
            onClick={() => mutate()}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* ── Generic error ── */}
      {error && !notConfigured && (
        <div className="p-4 border border-[var(--accent-rose)] rounded-lg text-sm text-[var(--accent-rose)] font-primary max-w-[640px]">
          {error.message}
        </div>
      )}

      {/* ── Empty hint (upload tile below still shows) ── */}
      {!error && !isLoading && files.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] font-primary">
          <ImageIcon size={16} className="text-[var(--text-disabled)]" />
          No images in the bucket yet — upload your first one below.
        </div>
      )}

      {/* ── Grid ── */}
      {!notConfigured && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
          {/* Upload tile — always first */}
          <button
            type="button"
            className="h-[203px] rounded-lg border-2 border-dashed border-[var(--border-light)] bg-transparent flex flex-col items-center justify-center gap-2 cursor-pointer text-[var(--text-disabled)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] transition-colors disabled:opacity-50"
            onClick={() => uploadInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 size={26} className="animate-spin" /> : <Plus size={30} />}
            <span className="text-xs font-primary">{isUploading ? "Uploading..." : "Upload"}</span>
          </button>
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleUpload(e.target.files);
              e.target.value = "";
            }}
          />

          {files.map((file) => {
            const isSelected = selected.has(file.id);
            return (
              <div
                key={file.id}
                className={`flex flex-col rounded-lg border overflow-hidden bg-[var(--bg-secondary)] group ${
                  isSelected ? "border-[var(--accent-primary)]" : "border-[var(--border-subtle)]"
                }`}
              >
                <div className="relative">
                  <AuthedImage
                    src={mediaPreviewUrl(file.id, 360)}
                    alt={file.name}
                    className="w-full h-[160px] object-cover cursor-pointer"
                    onClick={() => setPreview(file)}
                  />
                  <label
                    className="absolute top-1.5 left-1.5 flex items-center justify-center w-5 h-5 rounded-sm bg-black/50 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 accent-[var(--accent-primary)] cursor-pointer"
                      checked={isSelected}
                      onChange={() => toggleSelect(file.id)}
                    />
                  </label>
                  <button
                    className="absolute top-1.5 right-1.5 flex items-center justify-center w-6 h-6 rounded-sm bg-black/50 border-0 text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setPreview(file)}
                    title="Review"
                  >
                    <Eye size={13} />
                  </button>
                </div>
                <div className="flex flex-col gap-1 p-3">
                  <span
                    className="text-xs font-semibold text-[var(--text-secondary)] font-primary overflow-hidden text-ellipsis whitespace-nowrap"
                    title={file.name}
                  >
                    {file.name}
                  </span>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-[var(--text-muted)] font-primary">
                      {formatBytes(file.sizeOriginal)}
                    </span>
                    <button
                      className="flex items-center justify-center w-7 h-7 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--accent-rose)] opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(file)}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {!notConfigured && total > PAGE_SIZE && (
        <div className="shrink-0 flex items-center justify-center gap-3 pt-2">
          <button
            className="flex items-center justify-center w-8 h-8 border border-[var(--border-subtle)] rounded-sm bg-transparent cursor-pointer text-[var(--text-secondary)] disabled:opacity-30"
            onClick={() => goToPage(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-[var(--text-muted)] font-primary">
            Page {page} / {totalPages}
          </span>
          <button
            className="flex items-center justify-center w-8 h-8 border border-[var(--border-subtle)] rounded-sm bg-transparent cursor-pointer text-[var(--text-secondary)] disabled:opacity-30"
            onClick={() => goToPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ═══════════════ LIGHTBOX ═══════════════ */}
      <ImagePreviewLightbox
        open={!!preview}
        onClose={() => setPreview(null)}
        caption={
          preview && (
            <>
              <span>{preview.name}</span>
              <span>{formatBytes(preview.sizeOriginal)}</span>
              <span>{formatDate(preview.createdAt)}</span>
            </>
          )
        }
      >
        {preview && (
          <AuthedImage
            src={mediaPreviewUrl(preview.id, 1400)}
            alt={preview.name}
            className="max-w-[90vw] max-h-[75vh] object-contain rounded-md"
          />
        )}
      </ImagePreviewLightbox>
    </div>
  );
}
