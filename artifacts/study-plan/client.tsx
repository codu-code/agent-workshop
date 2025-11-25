"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import { DocumentSkeleton } from "@/components/document-skeleton";
import {
  CheckCircleIcon,
  CircleIcon,
  CopyIcon,
  PenIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import type { StudyPlanData } from "./server";

type StudyPlanMetadata = Record<string, never>;

function StudyPlanViewer({
  content,
  isLoading,
  onSaveContent,
}: {
  content: string;
  isLoading: boolean;
  onSaveContent: (content: string, debounce: boolean) => void;
}) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(0);

  console.log(
    `[StudyPlanViewer] Render - isLoading: ${isLoading}, content length: ${content?.length || 0}`
  );

  if (isLoading || !content) {
    console.log(
      `[StudyPlanViewer] Showing skeleton (isLoading=${isLoading}, hasContent=${!!content})`
    );
    return <DocumentSkeleton artifactKind="study-plan" />;
  }

  let data: StudyPlanData;
  try {
    data = JSON.parse(content);
    console.log(
      `[StudyPlanViewer] Parsed plan for: ${data.topic}, ${data.weeks?.length || 0} weeks`
    );
  } catch (error) {
    console.error("[StudyPlanViewer] JSON parse error:", error);
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">Invalid study plan data</p>
      </div>
    );
  }

  const toggleTask = (weekIndex: number, taskIndex: number) => {
    console.log(
      `[StudyPlanViewer] Toggling task: week ${weekIndex}, task ${taskIndex}`
    );
    const newData = { ...data };
    newData.weeks[weekIndex].tasks[taskIndex].completed =
      !newData.weeks[weekIndex].tasks[taskIndex].completed;
    onSaveContent(JSON.stringify(newData, null, 2), true);
  };

  const totalTasks = data.weeks.reduce(
    (acc, week) => acc + week.tasks.length,
    0
  );
  const completedTasks = data.weeks.reduce(
    (acc, week) => acc + week.tasks.filter((t) => t.completed).length,
    0
  );
  const progressPercent =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6 md:p-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-bold text-2xl">{data.topic}</h1>
        <p className="text-muted-foreground">{data.duration}</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="mb-2 flex justify-between text-sm">
          <span>Progress</span>
          <span>
            {completedTasks}/{totalTasks} tasks ({Math.round(progressPercent)}%)
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Overview */}
      <div className="mb-6 rounded-lg border bg-card p-4">
        <h2 className="mb-2 font-semibold">Overview</h2>
        <p className="text-muted-foreground text-sm">{data.overview}</p>
      </div>

      {/* Weeks */}
      <div className="mb-6 space-y-4">
        {data.weeks.map((week, weekIndex) => {
          const weekCompleted = week.tasks.filter((t) => t.completed).length;
          const isExpanded = expandedWeek === weekIndex;

          return (
            <div className="rounded-lg border" key={`week-${week.week}`}>
              <button
                className="flex w-full items-center justify-between p-4 text-left hover:bg-accent"
                onClick={() => setExpandedWeek(isExpanded ? null : weekIndex)}
                type="button"
              >
                <div>
                  <h3 className="font-semibold">
                    Week {week.week}: {week.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {weekCompleted}/{week.tasks.length} tasks completed
                  </p>
                </div>
                <svg
                  className={cn(
                    "h-5 w-5 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M19 9l-7 7-7-7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </button>

              {isExpanded && (
                <div className="border-t p-4">
                  {/* Goals */}
                  <div className="mb-4">
                    <h4 className="mb-2 font-medium text-sm">Goals</h4>
                    <ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
                      {week.goals.map((goal) => (
                        <li key={goal}>{goal}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Tasks */}
                  <div className="mb-4">
                    <h4 className="mb-2 font-medium text-sm">Tasks</h4>
                    <div className="space-y-2">
                      {week.tasks.map((task, taskIndex) => (
                        <button
                          className="flex w-full items-start gap-3 rounded-lg p-2 text-left hover:bg-accent"
                          key={`task-${week.week}-${task.task}`}
                          onClick={() => toggleTask(weekIndex, taskIndex)}
                          type="button"
                        >
                          {task.completed ? (
                            <CheckCircleIcon
                              className="mt-0.5 shrink-0 text-green-500"
                              size={20}
                            />
                          ) : (
                            <CircleIcon
                              className="mt-0.5 shrink-0 text-muted-foreground"
                              size={20}
                            />
                          )}
                          <div className="flex-1">
                            <p
                              className={cn(
                                "text-sm",
                                task.completed &&
                                  "text-muted-foreground line-through"
                              )}
                            >
                              {task.task}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {task.duration}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resources */}
                  <div>
                    <h4 className="mb-2 font-medium text-sm">Resources</h4>
                    <ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
                      {week.resources.map((resource) => (
                        <li key={resource}>{resource}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tips */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
        <h3 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">
          Tips for Success
        </h3>
        <ul className="list-inside list-disc space-y-1 text-blue-800 text-sm dark:text-blue-200">
          {data.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export const studyPlanArtifact = new Artifact<"study-plan", StudyPlanMetadata>({
  kind: "study-plan",
  description: "Structured study plan with progress tracking.",
  onStreamPart: ({ streamPart, setArtifact }) => {
    console.log(`[StudyPlanArtifact] onStreamPart: ${streamPart.type}`);
    if (streamPart.type === "data-studyPlanDelta") {
      const contentLength = (streamPart.data as string)?.length || 0;
      console.log(
        `[StudyPlanArtifact] Setting content: ${contentLength} chars`
      );
      setArtifact((draft) => ({
        ...draft,
        content: streamPart.data,
        isVisible: true,
        status: "streaming",
      }));
    }
  },
  content: ({ content, isLoading, onSaveContent }) => (
    <StudyPlanViewer
      content={content}
      isLoading={isLoading}
      onSaveContent={onSaveContent}
    />
  ),
  actions: [
    {
      icon: <CopyIcon size={18} />,
      description: "Copy plan",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Study plan copied to clipboard!");
      },
    },
  ],
  toolbar: [
    {
      icon: <PenIcon size={18} />,
      description: "Adjust plan",
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "Please adjust the study plan to be more detailed with specific daily activities.",
            },
          ],
        });
      },
    },
  ],
});
