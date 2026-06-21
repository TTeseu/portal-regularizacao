"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import { Camera, Download, ExternalLink, ImageIcon, X } from "lucide-react";

type PhotoRef = {
  url: string;
  downloadUrl: string;
  name: string;
  source?: string;
};

export function CensoPhotoViewer({ value }: { value: unknown }) {
  const [open, setOpen] = useState(false);
  const photos = useMemo(() => normalizePhotos(value), [value]);

  if (photos.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-edp-muted">
        <Camera size={13} />
        Sem fotos
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border border-edp/30 bg-edp/10 px-3 py-1 text-xs font-bold text-edp transition hover:border-edp hover:bg-edp/20"
      >
        <Camera size={13} />
        Fotos ({photos.length})
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-white/12 bg-[#1E2D44] shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl border border-edp/30 bg-edp/10 text-edp">
                  <ImageIcon size={18} />
                </span>
                <div>
                  <h2 className="font-bold text-white">Fotos do CENSO</h2>
                  <p className="text-xs text-edp-muted">{photos.length} arquivo(s) vinculados ao registro.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-edp-muted transition hover:border-edp/40 hover:text-white"
                aria-label="Fechar fotos"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {photos.map((photo, index) => (
                  <article key={`${photo.url}-${index}`} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                    <a href={photo.url} target="_blank" rel="noreferrer" className="block bg-black/20">
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="h-56 w-full object-cover"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    </a>
                    <div className="space-y-3 p-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-white">{photo.name}</div>
                        {photo.source ? <div className="mt-1 text-xs text-edp-muted">{photo.source}</div> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a className="btn-secondary h-9 px-3 text-xs" href={photo.url} target="_blank" rel="noreferrer">
                          <ExternalLink size={14} />
                          Abrir
                        </a>
                        <a className="btn-primary h-9 px-3 text-xs" href={photo.downloadUrl} target="_blank" rel="noreferrer">
                          <Download size={14} />
                          Baixar
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function normalizePhotos(value: unknown): PhotoRef[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => normalizePhoto(item, index)).filter((item): item is PhotoRef => Boolean(item));
}

function normalizePhoto(item: unknown, index: number): PhotoRef | null {
  if (typeof item === "string") {
    const url = item.trim();
    if (!isOpenableUrl(url)) return null;
    return { url, downloadUrl: url, name: fileNameFromUrl(url) || `Foto ${index + 1}` };
  }

  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  const displayUrl = firstString(row.thumbnail_url, row.thumbnailUrl, row.url, row.file_url, row.fileUrl, row.href, row.public_url, row.publicUrl, row.download_url, row.downloadUrl);
  const downloadUrl = firstString(row.download_url, row.downloadUrl, row.url, row.file_url, row.fileUrl, row.href, row.public_url, row.publicUrl, displayUrl);

  if (!displayUrl || !isOpenableUrl(displayUrl)) return null;

  const name =
    firstString(row.nome, row.name, row.filename, row.file_name, row.fileName, row.external_id, row.externalId) ||
    fileNameFromUrl(displayUrl) ||
    `Foto ${index + 1}`;

  const source = firstString(row.source, row.storage, row.bucket, row.content_type, row.contentType);

  return {
    url: displayUrl,
    downloadUrl: downloadUrl && isOpenableUrl(downloadUrl) ? downloadUrl : displayUrl,
    name,
    source
  };
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function isOpenableUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function fileNameFromUrl(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() || "");
  } catch {
    return url.split("/").filter(Boolean).pop() || "";
  }
}
