"use client";

import { useMemo, useRef, useState } from "react";
import { Trash2, Eye, Download, Upload, Loader2, RefreshCw, Wifi } from "lucide-react";
import { useToast } from "@/src/app/_components/Toast";
import { useConfirm } from "@/src/app/_components/ConfirmDialog";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableFetchResult,
  type DataTableRef,
} from "@/src/app/_components/DataTable";
import {
  fetchMediaList,
  deleteMediaFile,
  deleteMediaFiles,
  MEDIA_NOT_CONFIGURED_CODE,
  MediaApiError,
  type MediaFile,
} from "@/src/hooks/use-admin-media";
import { uploadMediaFile } from "@/src/hooks/use-media-upload";
import { getAccessToken } from "@/src/lib/auth-api";
import { toMediaUrl } from "@/src/lib/media-url";
import { ImagePreviewLightbox } from "@/src/app/_components/ImagePreviewLightbox";
import { downloadMediaFile } from "./_common/download";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7001";

const PAGE_SIZE = 20;

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

/** "image/svg+xml" → "SVG", "image/webp" → "WEBP" */
function formatType(mimeType: string): string {
  return (mimeType.split("/")[1] ?? mimeType).split("+")[0].toUpperCase();
}

const secondaryButtonClass =
  "flex items-center gap-1.5 py-[10px] px-4 bg-transparent border border-[var(--border-subtle)] rounded-lg text-sm font-primary text-[var(--text-secondary)] cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-40";
const actionButtonClass =
  "flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer hover:opacity-70 disabled:opacity-40";

export default function MediaContent() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const tableRef = useRef<DataTableRef>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<MediaApiError | null>(null);
  const [preview, setPreview] = useState<MediaFile | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const notConfigured = loadError?.errorCode === MEDIA_NOT_CONFIGURED_CODE;

  /* ── fetchData for DataTable ── */
  const fetchMedia = async (
    params: DataTableFetchParams
  ): Promise<DataTableFetchResult<MediaFile>> => {
    const res = await fetchMediaList({ page: params.page, limit: params.limit });
    setLoadError(null);
    setTotal(res.total);
    return { data: res.data, total: res.total };
  };

  const handleUpload = async (fileList: File[]) => {
    const images = fileList.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) {
      toast.error("Only image files can be uploaded");
      return;
    }
    setIsUploading(true);
    try {
      const results = await Promise.allSettled(images.map((f) => uploadMediaFile(f)));
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const firstError = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
      if (succeeded > 0) toast.success(`${succeeded} image${succeeded !== 1 ? "s" : ""} uploaded`);
      if (firstError) {
        const failed = images.length - succeeded;
        const reason =
          firstError.reason instanceof Error ? firstError.reason.message : "Upload failed";
        toast.error(failed > 1 ? `${failed} images failed to upload — ${reason}` : reason);
      }
      if (succeeded > 0) {
        /* Newest first: jump back to page 1 so the new files are visible. */
        tableRef.current?.reset();
        tableRef.current?.refresh();
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (file: MediaFile) => {
    setDownloadingId(file.id);
    try {
      await downloadMediaFile(file);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download image");
    } finally {
      setDownloadingId(null);
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
      await deleteMediaFile(file.id);
      toast.success("Image deleted");
      setPreview((current) => (current?.id === file.id ? null : current));
      tableRef.current?.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete image");
    }
  };

  const handleBulkDelete = async (ids: string[], clearSelection: () => void) => {
    const ok = await confirm({
      title: "Delete images",
      message: `Delete ${ids.length} image${ids.length !== 1 ? "s" : ""}? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    const { succeeded, failed } = await deleteMediaFiles(ids);
    if (succeeded > 0) toast.success(`${succeeded} image${succeeded !== 1 ? "s" : ""} deleted`);
    if (failed > 0) toast.error(`${failed} image${failed !== 1 ? "s" : ""} failed to delete`);
    clearSelection();
    tableRef.current?.refresh();
  };

  const handlePing = async () => {
    setIsPinging(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/admin/media/ping`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Ping failed");
      toast.success("Ping OK — Supabase Storage is reachable");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ping failed — check Supabase config");
    } finally {
      setIsPinging(false);
    }
  };

  /* ── Column definitions ── */
  const columns: DataTableColumn<MediaFile>[] = useMemo(
    () => [
      {
        key: "preview",
        header: "Preview",
        width: "88px",
        render: (file) => (
          <button
            type="button"
            className="block w-12 h-12 p-0 border border-[var(--border-subtle)] rounded-sm overflow-hidden bg-[var(--bg-elevated)] cursor-pointer"
            onClick={() => setPreview(file)}
            title="Preview"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- public Supabase Storage URL */}
            <img
              src={toMediaUrl(file.url)}
              alt={file.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </button>
        ),
      },
      {
        key: "name",
        header: "Name",
        render: (file) => (
          <div className="max-w-[240px]">
            <p className="font-semibold text-sm truncate" title={file.name}>
              {file.name}
            </p>
            <p className="sm:hidden text-xs text-[var(--text-muted)] mt-0.5">
              {formatType(file.mimeType)} · {formatBytes(file.sizeOriginal)}
            </p>
          </div>
        ),
      },
      {
        key: "type",
        header: "Type",
        hideBelow: "md",
        render: (file) => (
          <span className="inline-block py-0.5 px-2 rounded-full text-xs font-semibold font-primary bg-[rgba(107,101,96,0.08)] text-[var(--text-muted)]">
            {formatType(file.mimeType)}
          </span>
        ),
      },
      {
        key: "size",
        header: "Size",
        hideBelow: "sm",
        render: (file) => (
          <span className="whitespace-nowrap text-[var(--text-secondary)]">
            {formatBytes(file.sizeOriginal)}
          </span>
        ),
      },
      {
        key: "uploaded",
        header: "Uploaded",
        hideBelow: "lg",
        render: (file) => (
          <span className="whitespace-nowrap text-[var(--text-secondary)]">
            {formatDate(file.createdAt)}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (file) => (
          <div className="flex gap-1 justify-end">
            <button
              className={`${actionButtonClass} text-[var(--text-secondary)]`}
              onClick={() => setPreview(file)}
              title="Preview"
            >
              <Eye size={14} />
            </button>
            <button
              className={`${actionButtonClass} text-[var(--text-secondary)]`}
              onClick={() => handleDownload(file)}
              disabled={downloadingId === file.id}
              title="Download"
            >
              {downloadingId === file.id ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
            </button>
            <button
              className={`${actionButtonClass} text-[var(--accent-rose)]`}
              onClick={() => handleDelete(file)}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [downloadingId]
  );

  /* ── Drag & drop — depth counter because dragenter/leave also fire on children ── */
  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  const dropHandlers = loadError
    ? {}
    : {
        onDragEnter: (e: React.DragEvent) => {
          if (!hasFiles(e)) return;
          dragDepthRef.current += 1;
          setIsDragging(true);
        },
        onDragOver: (e: React.DragEvent) => {
          if (hasFiles(e)) e.preventDefault();
        },
        onDragLeave: (e: React.DragEvent) => {
          if (!hasFiles(e)) return;
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) setIsDragging(false);
        },
        onDrop: (e: React.DragEvent) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          dragDepthRef.current = 0;
          setIsDragging(false);
          if (!isUploading) handleUpload(Array.from(e.dataTransfer.files));
        },
      };

  return (
    <div className="relative flex flex-col gap-6 h-full min-h-0" {...dropHandlers}>
      {/* ── Header ── */}
      <div className="shrink-0 flex flex-wrap justify-between items-start gap-3">
        <div>
          <h1 className="font-display text-2xl text-[var(--text-heading)] font-normal">Media</h1>
          <p className="text-xs text-[var(--text-muted)] font-primary mt-1">
            {total} image{total !== 1 ? "s" : ""} stored in Supabase Storage
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={secondaryButtonClass}
            onClick={handlePing}
            disabled={isPinging}
            title="Checks that the Supabase service role key and bucket are reachable"
          >
            <Wifi size={14} className={isPinging ? "animate-pulse" : ""} />
            <span className="hidden sm:inline">Ping Supabase</span>
          </button>
          <button
            className={secondaryButtonClass}
            onClick={() => (loadError ? setLoadError(null) : tableRef.current?.refresh())}
            title="Refresh"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {!loadError && (
            <button
              className="flex items-center gap-1.5 py-[10px] px-5 bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-lg text-sm font-semibold font-primary cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60"
              onClick={() => uploadInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          )}
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleUpload(Array.from(e.target.files));
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* ── Not configured yet ── */}
      {notConfigured && (
        <div className="flex flex-col gap-3 p-6 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-secondary)] max-w-[640px]">
          <h2 className="font-display text-lg text-[var(--text-heading)] font-normal">
            Supabase Storage is not configured yet
          </h2>
          <p className="text-sm text-[var(--text-muted)] font-primary leading-relaxed">
            The bucket and service role key are missing. Open your{" "}
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent-primary)] underline"
            >
              Supabase dashboard
            </a>{" "}
            and follow these steps:
          </p>
          <ol className="text-sm text-[var(--text-secondary)] font-primary leading-relaxed list-decimal pl-5 space-y-1">
            <li>
              Storage → Create a new bucket (e.g. <code>media</code>) and mark it{" "}
              <strong>public</strong>.
            </li>
            <li>
              Project Settings → API → copy the Project URL and the <code>service_role</code> secret
              key.
            </li>
            <li>
              Fill in <code>SUPABASE_URL</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code> and{" "}
              <code>SUPABASE_STORAGE_BUCKET</code> in the backend&apos;s <code>.env</code>{" "}
              (clothes-shop-api), then restart it.
            </li>
          </ol>
          <button
            className="self-start mt-1 flex items-center gap-1.5 py-2 px-4 bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-lg text-sm font-semibold font-primary cursor-pointer"
            onClick={() => setLoadError(null)}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* ── Generic error ── */}
      {loadError && !notConfigured && (
        <div className="flex flex-col items-start gap-3 p-4 border border-[var(--accent-rose)] rounded-lg max-w-[640px]">
          <p className="text-sm text-[var(--accent-rose)] font-primary">{loadError.message}</p>
          <button className={secondaryButtonClass} onClick={() => setLoadError(null)}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* ── Table ── */}
      {!loadError && (
        <DataTable<MediaFile>
          tableRef={tableRef}
          columns={columns}
          fetchData={fetchMedia}
          pageSize={PAGE_SIZE}
          searchable={false}
          selectable
          onError={(err) =>
            setLoadError(
              err instanceof MediaApiError ? err : new MediaApiError("Failed to load images")
            )
          }
          renderBulkActions={({ keys, clear }) => (
            <button
              className="flex items-center gap-1.5 h-7 px-3 border-0 rounded-sm bg-[var(--accent-rose)] text-[var(--color-noir)] text-xs font-semibold font-primary cursor-pointer"
              onClick={() => handleBulkDelete(keys, clear)}
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
          emptyMessage="No images yet — upload your first one, or drag files anywhere on this page."
        />
      )}

      {/* ── Drop overlay ── */}
      {isDragging && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--accent-primary)] bg-[rgba(251,248,241,0.9)] pointer-events-none">
          <Upload size={30} className="text-[var(--accent-primary)]" />
          <span className="text-sm font-semibold text-[var(--text-secondary)] font-primary">
            Drop images to upload
          </span>
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
              <button
                className="flex items-center gap-1.5 py-1 px-3 rounded-full bg-white/15 border-0 text-white text-xs font-primary cursor-pointer hover:bg-white/25 transition-colors disabled:opacity-50"
                onClick={() => handleDownload(preview)}
                disabled={downloadingId === preview.id}
              >
                {downloadingId === preview.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Download size={12} />
                )}
                Download
              </button>
            </>
          )
        }
      >
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element -- public Supabase Storage URL
          <img
            src={toMediaUrl(preview.url)}
            alt={preview.name}
            className="max-w-[90vw] max-h-[75vh] object-contain rounded-md"
          />
        )}
      </ImagePreviewLightbox>
    </div>
  );
}
