"use client";

import { useEffect, useRef } from "react";
import { Streamdown } from "streamdown";

export function ProseContent({ content }: { content: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    // Find all code blocks and add copy buttons
    const codeBlocks = containerRef.current.querySelectorAll("pre");

    for (const pre of codeBlocks) {
      // Skip if already has a copy button
      if (pre.querySelector(".copy-button")) {
        continue;
      }

      // Create copy button
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        "copy-button absolute top-2 right-2 p-2 rounded-md bg-zinc-700 hover:bg-zinc-600 text-white opacity-0 group-hover:opacity-100 transition-opacity";
      button.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;
      button.title = "Copy code";

      button.onclick = async () => {
        const code = pre.querySelector("code")?.textContent || "";
        await navigator.clipboard.writeText(code);
        button.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
        setTimeout(() => {
          button.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;
        }, 2000);
      };

      // Make pre relative and add group class for hover
      pre.classList.add("relative", "group");
      pre.appendChild(button);
    }
  }, []);

  return (
    <div
      className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-pre:border prose-pre:border-zinc-800 prose-td:border-t prose-pre:bg-zinc-950 prose-th:bg-muted prose-td:px-4 prose-th:px-4 prose-td:py-2 prose-th:py-2 prose-li:pl-2 prose-ol:pl-6 prose-ul:pl-6 prose-table:text-sm prose-li:marker:text-muted-foreground prose-code:before:content-none prose-code:after:content-none [&_li]:my-1 [&_ol]:list-decimal [&_ul]:list-disc"
      ref={containerRef}
    >
      <Streamdown>{content}</Streamdown>
    </div>
  );
}
