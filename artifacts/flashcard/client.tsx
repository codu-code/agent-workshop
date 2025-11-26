"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import { DocumentSkeleton } from "@/components/document-skeleton";
import { CopyIcon, RefreshCwIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FlashcardData } from "./server";

type FlashcardMetadata = Record<string, never>;

function FlashcardViewer({
  content,
  isLoading,
}: {
  content: string;
  isLoading: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  console.log(
    `[FlashcardViewer] Render - isLoading: ${isLoading}, content length: ${content?.length || 0}`
  );

  if (isLoading || !content) {
    console.log(
      `[FlashcardViewer] Showing skeleton (isLoading=${isLoading}, hasContent=${!!content})`
    );
    return <DocumentSkeleton artifactKind="flashcard" />;
  }

  let data: FlashcardData;
  try {
    data = JSON.parse(content);
    console.log(
      `[FlashcardViewer] Parsed ${data.questions?.length || 0} questions for topic: ${data.topic}`
    );
  } catch (error) {
    console.error("[FlashcardViewer] JSON parse error:", error);
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">Invalid flashcard data</p>
      </div>
    );
  }

  const currentQuestion = data.questions[currentIndex];
  const isLastQuestion = currentIndex === data.questions.length - 1;
  const isAnswered = selectedAnswer !== null;

  const handleSelectAnswer = (index: number) => {
    if (isAnswered) {
      return;
    }
    setSelectedAnswer(index);
    setShowExplanation(true);
    setScore((prev) => ({
      correct: prev.correct + (index === currentQuestion.correctAnswer ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Reset quiz
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setScore({ correct: 0, total: 0 });
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const optionLabels = ["A", "B", "C", "D"];

  return (
    <div className="flex h-full flex-col p-6 md:p-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">{data.topic}</h2>
          <p className="text-muted-foreground text-sm">
            Question {currentIndex + 1} of {data.questions.length}
          </p>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 font-medium text-sm">
          Score: {score.correct}/{score.total}
        </div>
      </div>

      {/* Question */}
      <div className="mb-6 rounded-lg border bg-card p-6">
        <p className="font-medium text-lg">{currentQuestion.question}</p>
      </div>

      {/* Options */}
      <div className="mb-6 grid gap-3">
        {currentQuestion.options.map((option, index) => {
          const isCorrect = index === currentQuestion.correctAnswer;
          const isSelected = selectedAnswer === index;

          return (
            <button
              className={cn(
                "flex items-center gap-3 rounded-lg border p-4 text-left transition-all",
                !isAnswered && "hover:border-primary hover:bg-accent",
                isAnswered &&
                  isCorrect &&
                  "border-green-500 bg-green-50 dark:bg-green-950",
                isAnswered &&
                  isSelected &&
                  !isCorrect &&
                  "border-red-500 bg-red-50 dark:bg-red-950",
                isAnswered && !isSelected && !isCorrect && "opacity-50"
              )}
              disabled={isAnswered}
              key={`option-${currentIndex}-${option}`}
              onClick={() => handleSelectAnswer(index)}
              type="button"
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-medium",
                  isAnswered &&
                    isCorrect &&
                    "border-green-500 bg-green-500 text-white",
                  isAnswered &&
                    isSelected &&
                    !isCorrect &&
                    "border-red-500 bg-red-500 text-white"
                )}
              >
                {optionLabels[index]}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {showExplanation && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <p className="font-medium text-blue-900 text-sm dark:text-blue-100">
            {selectedAnswer === currentQuestion.correctAnswer
              ? "✓ Correct!"
              : `✗ Incorrect. The correct answer is ${optionLabels[currentQuestion.correctAnswer]}.`}
          </p>
          <p className="mt-2 text-blue-800 text-sm dark:text-blue-200">
            {currentQuestion.explanation}
          </p>
        </div>
      )}

      {/* Navigation */}
      {isAnswered && (
        <div className="mt-auto">
          <Button className="w-full" onClick={handleNext}>
            {isLastQuestion ? "Restart Quiz" : "Next Question"}
          </Button>
        </div>
      )}
    </div>
  );
}

export const flashcardArtifact = new Artifact<"flashcard", FlashcardMetadata>({
  kind: "flashcard",
  description: "Interactive flashcard quiz for testing knowledge.",
  onStreamPart: ({ streamPart, setArtifact }) => {
    console.log(`[FlashcardArtifact] onStreamPart: ${streamPart.type}`);
    if (streamPart.type === "data-flashcardDelta") {
      const contentLength = (streamPart.data as string)?.length || 0;
      console.log(
        `[FlashcardArtifact] Setting content: ${contentLength} chars`
      );
      setArtifact((draft) => ({
        ...draft,
        content: streamPart.data,
        isVisible: true,
        status: "streaming",
      }));
    }
  },
  content: ({ content, isLoading }) => (
    <FlashcardViewer content={content} isLoading={isLoading} />
  ),
  actions: [
    {
      icon: <CopyIcon size={18} />,
      description: "Copy quiz data",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Quiz data copied to clipboard!");
      },
    },
  ],
  toolbar: [
    {
      icon: <RefreshCwIcon size={18} />,
      description: "Generate new questions",
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "Generate different questions on the same topic.",
            },
          ],
        });
      },
    },
  ],
});
