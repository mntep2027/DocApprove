"use client";

import { useEffect, useRef, useState } from "react";
import { DocumentIcon, DownloadIcon } from "@/components/icons";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function LoadingSpinner() {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center py-12">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-surface-border border-t-brand-dark" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

function Fallback({ url, message }: { url: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <DocumentIcon className="h-10 w-10 text-neutral-300" />
      <p className="text-sm text-neutral-500">{message}</p>
      <a
        href={url}
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-dark hover:underline"
      >
        <DownloadIcon className="h-3.5 w-3.5" />
        Download to view
      </a>
    </div>
  );
}

function TextPreview({ url }: { url: string }) {
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; text?: string }>({
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch file");
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setState({ status: "ready", text });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (state.status === "loading") {
    return <LoadingSpinner />;
  }
  if (state.status === "error") {
    return <Fallback url={url} message="Couldn't load a preview of this file." />;
  }
  return (
    <pre className="whitespace-pre-wrap break-words rounded-lg bg-surface p-4 text-xs text-neutral-800">
      {state.text}
    </pre>
  );
}

function DocxPreview({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch(url).then((res) => {
      if (!res.ok) throw new Error("Failed to fetch file");
      return res.blob();
    }), import("docx-preview")])
      .then(async ([blob, docxPreview]) => {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = "";
        await docxPreview.renderAsync(blob, containerRef.current);
        if (!cancelled) setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (status === "error") {
    return <Fallback url={url} message="Couldn't load a preview of this file." />;
  }
  return (
    <>
      {status === "loading" && <LoadingSpinner />}
      <div ref={containerRef} className={status === "loading" ? "hidden" : undefined} />
    </>
  );
}

export function DocumentPreview({
  url,
  fileName,
  mimeType,
}: {
  url: string;
  fileName: string;
  mimeType: string;
}) {
  const content = (() => {
    if (mimeType.startsWith("image/")) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={url} alt={fileName} className="mx-auto max-w-full rounded-lg" />;
    }
    if (mimeType === "application/pdf") {
      return <iframe src={url} title={fileName} className="h-[70vh] w-full rounded-lg border border-surface-border" />;
    }
    if (mimeType.startsWith("text/")) {
      return <TextPreview url={url} />;
    }
    if (mimeType === DOCX_MIME) {
      return <DocxPreview url={url} />;
    }
    return <Fallback url={url} message="No preview available for this file type." />;
  })();

  return (
    <div className="max-h-[50vh] overflow-auto sm:max-h-[70vh]">{content}</div>
  );
}
