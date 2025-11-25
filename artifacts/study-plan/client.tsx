"use client";

import { Artifact } from "@/components/create-artifact";

// Placeholder study-plan artifact - full implementation coming in Chapter 4
export const studyPlanArtifact = new Artifact<"study-plan">({
  kind: "study-plan",
  description: "Interactive study plan with progress tracking",
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === "data-studyPlanDelta") {
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
          <div className="text-muted-foreground">Creating study plan...</div>
          <div className="h-2 w-48 animate-pulse rounded bg-muted-foreground/20" />
        </div>
      );
    }

    // Parse and display basic study plan data
    try {
      const data = JSON.parse(content);
      return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-8">
          <h2 className="font-bold text-xl">{data.topic}</h2>
          <p className="text-muted-foreground">
            {data.duration} - {data.weeks?.length || 0} weeks
          </p>
          <p className="text-sm">{data.overview}</p>
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-muted-foreground text-sm">
              Full study plan UI coming in Chapter 4
            </p>
          </div>
        </div>
      );
    } catch {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <p className="text-muted-foreground">Loading study plan data...</p>
        </div>
      );
    }
  },
  actions: [],
  toolbar: [],
});
