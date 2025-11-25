"use client";

import { useEffect } from "react";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import { artifactDefinitions } from "./artifact";
import { useDataStream } from "./data-stream-provider";

export function DataStreamHandler() {
  const { dataStream, setDataStream } = useDataStream();

  const { artifact, setArtifact, setMetadata } = useArtifact();

  useEffect(() => {
    if (!dataStream?.length) {
      return;
    }

    const newDeltas = dataStream.slice();
    setDataStream([]);

    for (const delta of newDeltas) {
      // Debug logging for all incoming deltas
      const deltaInfo = delta.type.includes("Delta")
        ? `(${(delta.data as string)?.length || 0} chars)`
        : delta.data !== null
          ? `= ${JSON.stringify(delta.data).slice(0, 50)}`
          : "";
      console.log(
        `[DataStreamHandler] Delta received: ${delta.type} ${deltaInfo}`
      );

      const artifactDefinition = artifactDefinitions.find(
        (currentArtifactDefinition) =>
          currentArtifactDefinition.kind === artifact.kind
      );

      if (!artifactDefinition && artifact.kind !== "text") {
        console.warn(
          `[DataStreamHandler] No definition found for artifact kind: ${artifact.kind}`
        );
      }

      // Call the artifact's onStreamPart handler with error handling
      if (artifactDefinition?.onStreamPart) {
        try {
          artifactDefinition.onStreamPart({
            streamPart: delta,
            setArtifact,
            setMetadata,
          });
        } catch (error) {
          console.error(
            `[DataStreamHandler] Error in onStreamPart for ${artifact.kind}:`,
            error
          );
        }
      }

      setArtifact((draftArtifact) => {
        if (!draftArtifact) {
          return { ...initialArtifactData, status: "streaming" };
        }

        switch (delta.type) {
          case "data-id":
            console.log(
              `[DataStreamHandler] Setting documentId: ${delta.data}`
            );
            return {
              ...draftArtifact,
              documentId: delta.data,
              status: "streaming",
            };

          case "data-title":
            console.log(`[DataStreamHandler] Setting title: ${delta.data}`);
            return {
              ...draftArtifact,
              title: delta.data,
              status: "streaming",
            };

          case "data-kind":
            console.log(`[DataStreamHandler] Setting kind: ${delta.data}`);
            return {
              ...draftArtifact,
              kind: delta.data,
              status: "streaming",
            };

          case "data-clear":
            console.log("[DataStreamHandler] Clearing content");
            return {
              ...draftArtifact,
              content: "",
              status: "streaming",
            };

          case "data-finish":
            console.log(
              "[DataStreamHandler] Finish signal received - status -> idle"
            );
            return {
              ...draftArtifact,
              status: "idle",
            };

          default:
            // Delta types like flashcardDelta, studyPlanDelta, textDelta are handled by onStreamPart
            return draftArtifact;
        }
      });
    }
  }, [dataStream, setArtifact, setMetadata, artifact, setDataStream]);

  return null;
}
