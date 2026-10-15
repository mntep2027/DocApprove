"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { DocumentPreview } from "@/components/document-preview";
import { DownloadIcon, EyeIcon } from "@/components/icons";

export function VersionRow({
  versionNumber,
  fileName,
  isCurrent,
  downloadUrl,
  previewUrl,
  mimeType,
}: {
  versionNumber: number;
  fileName: string;
  isCurrent: boolean;
  downloadUrl: string | null;
  previewUrl: string | null;
  mimeType: string;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <li className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="flex items-center gap-2">
        v{versionNumber} — {fileName}
        {isCurrent ? (
          <span className="rounded-full bg-brand-tint px-2 py-0.5 text-xs font-medium text-brand-dark">
            Current
          </span>
        ) : (
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-neutral-500">Archived</span>
        )}
      </span>
      {downloadUrl || previewUrl ? (
        <span className="flex items-center gap-3">
          {previewUrl && (
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-1 text-brand-dark hover:underline"
            >
              <EyeIcon className="h-3.5 w-3.5" />
              Preview
            </button>
          )}
          {downloadUrl && (
            <a href={downloadUrl} className="inline-flex items-center gap-1 text-brand-dark hover:underline">
              <DownloadIcon className="h-3.5 w-3.5" />
              Download
            </a>
          )}
        </span>
      ) : (
        <span className="text-neutral-400">Unavailable</span>
      )}
      {previewUrl && (
        <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title={`v${versionNumber} — ${fileName}`}>
          <DocumentPreview url={previewUrl} fileName={fileName} mimeType={mimeType} />
        </Modal>
      )}
    </li>
  );
}
