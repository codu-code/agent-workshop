"use client";

import { Artifact } from "@/components/create-artifact";

// Placeholder flashcard artifact - full implementation coming in Chapter 4
export const flashcardArtifact = new Artifact<"flashcard">({
  kind: "flashcard",
  description: "Interactive quiz flashcards",
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === "data-flashcardDelta") {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible: true,
        status: "streaming",
      }));
    }
  },
  content: ({ content, status }) => {
    if (status === "streaming" || !content) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
          <div className="text-muted-foreground">Generating quiz...</div>
          <div className="h-2 w-48 animate-pulse rounded bg-muted-foreground/20" />
        </div>
      );
    }

    // Parse and display basic quiz data
    try {
      const data = JSON.parse(content);
      return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-8">
          <h2 className="font-bold text-xl">{data.topic}</h2>
          <p className="text-muted-foreground">
            {data.questions?.length || 0} questions generated
          </p>
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-muted-foreground text-sm">
              Full flashcard UI coming in Chapter 4
            </p>
          </div>
        </div>
      );
    } catch {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <p className="text-muted-foreground">Loading flashcard data...</p>
        </div>
      );
    }
  },
  actions: [],
  toolbar: [],
});
