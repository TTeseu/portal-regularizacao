"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Download, ImageIcon, Maximize2, Minimize2, X } from "lucide-react";

type PhotoRef = {
  url: string;
  downloadUrl: string;
  name: string;
  source?: string;
};

export function CensoPhotoViewer({ value }: { value: unknown }) {
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const photos = useMemo(() => normalizePhotos(value), [value]);
  const selectedPhoto = selectedIndex === null ? null : photos[selectedIndex] || null;

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
                onClick={() => {
                  setOpen(false);
                  setSelectedIndex(null);
                  setZoomed(false);
                }}
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
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIndex(index);
                        setZoomed(false);
                      }}
                      className="block w-full bg-black/20 text-left"
                    >
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="h-56 w-full object-cover"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    </button>
                    <div className="space-y-3 p-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-white">{photo.name}</div>
                        {photo.source ? <div className="mt-1 text-xs text-edp-muted">{photo.source}</div> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="btn-secondary h-9 px-3 text-xs"
                          type="button"
                          onClick={() => {
                            setSelectedIndex(index);
                            setZoomed(false);
                          }}
                        >
                          <Maximize2 size={14} />
                          Visualizar
                        </button>
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

          {selectedPhoto ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-4">
              <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0D1726] shadow-2xl shadow-black/50">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-white">{selectedPhoto.name}</h3>
                    <p className="text-xs text-edp-muted">
                      Foto {(selectedIndex ?? 0) + 1} de {photos.length}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="btn-secondary h-10 px-3 text-xs" type="button" onClick={() => setZoomed((current) => !current)}>
                      {zoomed ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                      {zoomed ? "Ajustar" : "Zoom"}
                    </button>
                    <a className="btn-primary h-10 px-3 text-xs" href={selectedPhoto.downloadUrl} target="_blank" rel="noreferrer">
                      <Download size={15} />
                      Baixar
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIndex(null);
                        setZoomed(false);
                      }}
                      className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-edp-muted transition hover:border-edp/40 hover:text-white"
                      aria-label="Fechar visualizacao"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="relative flex min-h-[60vh] flex-1 items-center justify-center overflow-auto bg-black/30 p-4">
                  {photos.length > 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedIndex((current) => (current === null ? 0 : (current - 1 + photos.length) % photos.length));
                          setZoomed(false);
                        }}
                        className="absolute left-4 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#1E2D44]/80 text-white transition hover:border-edp/50 hover:text-edp"
                        aria-label="Foto anterior"
                      >
                        <ChevronLeft size={22} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedIndex((current) => (current === null ? 0 : (current + 1) % photos.length));
                          setZoomed(false);
                        }}
                        className="absolute right-4 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#1E2D44]/80 text-white transition hover:border-edp/50 hover:text-edp"
                        aria-label="Proxima foto"
                      >
                        <ChevronRight size={22} />
                      </button>
                    </>
                  ) : null}

                  <img
                    src={selectedPhoto.url}
                    alt={selectedPhoto.name}
                    className={zoomed ? "max-w-none cursor-zoom-out" : "max-h-[72vh] max-w-full cursor-zoom-in object-contain"}
                    onClick={() => setZoomed((current) => !current)}
                  />
                </div>
              </div>
            </div>
          ) : null}
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
