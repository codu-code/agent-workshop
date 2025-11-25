# Chapter 4: Custom Artifacts

In this chapter, we'll transform our quiz and study plan results into **interactive artifacts** - rich UI components that appear in a dedicated panel alongside the chat.

## Learning Objectives

By the end of this chapter, you'll understand:
- What artifacts are and how they differ from chat messages
- The artifact system architecture (server + client)
- How to stream data to artifacts in real-time
- How to create interactive artifact viewers

## What Are Artifacts?

Artifacts are **interactive documents** that exist alongside the chat conversation:

```
┌──────────────────────────────────────────────────────────────┐
│                        Chat Window                            │
├────────────────────────────┬─────────────────────────────────┤
│                            │                                  │
│  Chat Messages             │  Artifact Panel                  │
│                            │                                  │
│  User: Quiz me on React    │  ┌──────────────────────────┐   │
│                            │  │  Quiz: React Hooks       │   │
│  AI: I've created a quiz   │  │                          │   │
│      for you!              │  │  Q1: What is useState?   │   │
│                            │  │  ○ A) A hook             │   │
│                            │  │  ○ B) A component        │   │
│                            │  │  ○ C) A function         │   │
│                            │  │  ○ D) A class            │   │
│                            │  │                          │   │
│                            │  │  [Check Answer]          │   │
│                            │  └──────────────────────────┘   │
│                            │                                  │
└────────────────────────────┴─────────────────────────────────┘
```

### Benefits of Artifacts

| Feature | Chat Messages | Artifacts |
|---------|---------------|-----------|
| Persistence | Scroll away | Stay visible in panel |
| Interactivity | Read-only | Clickable, editable |
| Structure | Text/markdown | Rich UI components |
| Updates | New messages | Real-time state updates |

## The Artifact Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Agent                                  │
│  1. Generates structured data with generateObject             │
│  2. Streams to dataStream as "data-{kind}Delta"              │
│  3. Saves to database                                         │
└──────────────────────────┬───────────────────────────────────┘
                           │ Data Stream
                           ↓
┌──────────────────────────────────────────────────────────────┐
│                   DataStreamHandler                           │
│  1. Receives deltas                                           │
│  2. Finds artifact definition by kind                         │
│  3. Calls onStreamPart handler                                │
│  4. Updates useArtifact state                                 │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────────────────────────────────────────┐
│                   Artifact Viewer                             │
│  1. Reads from useArtifact state                              │
│  2. Renders interactive UI                                    │
│  3. Handles user interactions                                 │
└──────────────────────────────────────────────────────────────┘
```

## Data Stream Types

Add the new delta types to your custom types:

### File: `lib/types.ts`

```typescript
export type CustomUIDataTypes = {
  // Existing types...
  textDelta: string;
  codeDelta: string;
  sheetDelta: string;

  // New artifact types
  flashcardDelta: string;  // JSON string of FlashcardData
  studyPlanDelta: string;  // JSON string of StudyPlanData

  // Metadata
  id: string;
  title: string;
  kind: string;
  clear: null;
  finish: null;
};
```

## The Flashcard Artifact

### Step 1: Server Types

Define the data structure:

### File: `artifacts/flashcard/server.ts`

```typescript
export type FlashcardData = {
  topic: string;
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }>;
};
```

### Step 2: Client Artifact Definition

### File: `artifacts/flashcard/client.tsx`

```typescript
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

  if (isLoading || !content) {
    return <DocumentSkeleton artifactKind="flashcard" />;
  }

  let data: FlashcardData;
  try {
    data = JSON.parse(content);
  } catch {
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
    if (isAnswered) return;
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
          <h2 className="text-lg font-semibold">{data.topic}</h2>
          <p className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {data.questions.length}
          </p>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium">
          Score: {score.correct}/{score.total}
        </div>
      </div>

      {/* Question */}
      <div className="mb-6 rounded-lg border bg-card p-6">
        <p className="text-lg font-medium">{currentQuestion.question}</p>
      </div>

      {/* Options */}
      <div className="mb-6 grid gap-3">
        {currentQuestion.options.map((option, index) => {
          const isCorrect = index === currentQuestion.correctAnswer;
          const isSelected = selectedAnswer === index;

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectAnswer(index)}
              disabled={isAnswered}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-4 text-left transition-all",
                !isAnswered && "hover:border-primary hover:bg-accent",
                isAnswered && isCorrect && "border-green-500 bg-green-50 dark:bg-green-950",
                isAnswered && isSelected && !isCorrect && "border-red-500 bg-red-50 dark:bg-red-950"
              )}
            >
              <span className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border font-medium",
                isAnswered && isCorrect && "border-green-500 bg-green-500 text-white",
                isAnswered && isSelected && !isCorrect && "border-red-500 bg-red-500 text-white"
              )}>
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
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {selectedAnswer === currentQuestion.correctAnswer
              ? "✓ Correct!"
              : `✗ Incorrect. The answer is ${optionLabels[currentQuestion.correctAnswer]}.`}
          </p>
          <p className="mt-2 text-sm text-blue-800 dark:text-blue-200">
            {currentQuestion.explanation}
          </p>
        </div>
      )}

      {/* Next Button */}
      {isAnswered && (
        <div className="mt-auto">
          <Button onClick={handleNext} className="w-full">
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
    if (streamPart.type === "data-flashcardDelta") {
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
        toast.success("Quiz data copied!");
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
          parts: [{ type: "text", text: "Generate different questions on the same topic." }],
        });
      },
    },
  ],
});
```

## Updating the Agent to Create Artifacts

### File: `lib/ai/agents/quiz-master.ts` (updated)

```typescript
import { generateObject, tool } from "ai";
import { z } from "zod";
import { saveDocument } from "@/lib/db/queries";
import { myProvider } from "../providers";
import type { AgentResult, CreateAgentProps } from "./types";

const flashcardSchema = z.object({
  topic: z.string(),
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).length(4),
      correctAnswer: z.number().min(0).max(3),
      explanation: z.string(),
    })
  ),
});

export const createQuizMasterAgent = ({
  session,
  dataStream,
}: CreateAgentProps) =>
  tool({
    description:
      "Create a quiz to test knowledge on a topic. " +
      "Triggers: quiz me, test me, practice questions, flashcards.",
    inputSchema: z.object({
      topic: z.string().describe("The topic to quiz on"),
      numberOfQuestions: z.number().min(1).max(10).default(5),
      difficulty: z.enum(["easy", "medium", "hard", "mixed"]).default("medium"),
    }),
    execute: async ({
      topic,
      numberOfQuestions,
      difficulty,
    }): Promise<AgentResult> => {
      const documentId = crypto.randomUUID();
      const title = `Quiz: ${topic}`;

      console.log(`[QuizMaster] Creating quiz for "${topic}"`);

      // Signal artifact creation (opens the panel)
      dataStream.write({ type: "data-id", data: documentId });
      dataStream.write({ type: "data-title", data: title });
      dataStream.write({ type: "data-kind", data: "flashcard" });
      dataStream.write({ type: "data-clear", data: null });

      try {
        const { object } = await generateObject({
          model: myProvider.languageModel("chat-model"),
          schema: flashcardSchema,
          prompt: `Create ${numberOfQuestions} ${difficulty} quiz questions about "${topic}".`,
        });

        const content = JSON.stringify(object, null, 2);

        // Stream content to artifact
        dataStream.write({
          type: "data-flashcardDelta",
          data: content,
        });

        // Signal completion
        dataStream.write({ type: "data-finish", data: null });

        // Save to database
        if (session?.user?.id) {
          await saveDocument({
            id: documentId,
            title,
            content,
            kind: "flashcard",
            userId: session.user.id,
          });
        }

        return {
          agentName: "quiz-master",
          success: true,
          summary: `Created a quiz about "${topic}" with ${object.questions.length} questions!`,
          data: { documentId, topic, questionCount: object.questions.length },
        };
      } catch (error) {
        console.error(`[QuizMaster] Error:`, error);
        dataStream.write({ type: "data-finish", data: null });
        return {
          agentName: "quiz-master",
          success: false,
          summary: `Failed to create quiz. Please try again.`,
        };
      }
    },
  });
```

## Registering the Artifact

### File: `components/artifact.tsx` (add import)

```typescript
import { flashcardArtifact } from "@/artifacts/flashcard/client";
import { studyPlanArtifact } from "@/artifacts/study-plan/client";
// ... other imports

export const artifactDefinitions = [
  textArtifact,
  codeArtifact,
  sheetArtifact,
  flashcardArtifact,    // Add this
  studyPlanArtifact,    // Add this
];
```

## The Study Plan Artifact

The study plan artifact follows the same pattern but includes interactive checkboxes with persistence.

### Step 1: Server Types and Handler

### File: `artifacts/study-plan/server.ts`

```typescript
import { generateObject } from "ai";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

const studyPlanSchema = z.object({
  topic: z.string(),
  duration: z.string(),
  overview: z.string(),
  weeks: z.array(
    z.object({
      week: z.number(),
      title: z.string(),
      goals: z.array(z.string()),
      tasks: z.array(
        z.object({
          task: z.string(),
          duration: z.string(),
          completed: z.boolean().default(false),  // Tracks completion!
        })
      ),
      resources: z.array(z.string()),
    })
  ),
  tips: z.array(z.string()),
});

export type StudyPlanData = z.infer<typeof studyPlanSchema>;

export const studyPlanDocumentHandler = createDocumentHandler<"study-plan">({
  kind: "study-plan",
  onCreateDocument: async ({ title, dataStream }) => {
    const { object } = await generateObject({
      model: myProvider.languageModel("artifact-model"),
      schema: studyPlanSchema,
      prompt: `Create a structured study plan for: "${title}"`,
    });

    const content = JSON.stringify(object, null, 2);

    dataStream.write({
      type: "data-studyPlanDelta",
      data: content,
      transient: true,
    });

    return content;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    const currentData = JSON.parse(document.content || "{}") as StudyPlanData;

    const { object } = await generateObject({
      model: myProvider.languageModel("artifact-model"),
      schema: studyPlanSchema,
      prompt: `Update this study plan: "${description}"\n\nCurrent: ${JSON.stringify(currentData)}`,
    });

    const content = JSON.stringify(object, null, 2);

    dataStream.write({
      type: "data-studyPlanDelta",
      data: content,
      transient: true,
    });

    return content;
  },
});
```

### Step 2: Client Artifact with Checkbox Persistence

### File: `artifacts/study-plan/client.tsx`

```typescript
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import { DocumentSkeleton } from "@/components/document-skeleton";
import { CheckCircleIcon, CircleIcon, CopyIcon, PenIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { StudyPlanData } from "./server";

type StudyPlanMetadata = Record<string, never>;

function StudyPlanViewer({
  content,
  isLoading,
  onSaveContent,  // Key prop for persistence!
}: {
  content: string;
  isLoading: boolean;
  onSaveContent: (content: string, debounce: boolean) => void;
}) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(0);

  if (isLoading || !content) {
    return <DocumentSkeleton artifactKind="study-plan" />;
  }

  let data: StudyPlanData;
  try {
    data = JSON.parse(content);
  } catch {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">Invalid study plan data</p>
      </div>
    );
  }

  // Toggle task completion and persist to database
  const toggleTask = (weekIndex: number, taskIndex: number) => {
    const newData = { ...data };
    newData.weeks[weekIndex].tasks[taskIndex].completed =
      !newData.weeks[weekIndex].tasks[taskIndex].completed;

    // Save to database with debounce (true = wait before saving)
    onSaveContent(JSON.stringify(newData, null, 2), true);
  };

  // Calculate progress
  const totalTasks = data.weeks.reduce((acc, week) => acc + week.tasks.length, 0);
  const completedTasks = data.weeks.reduce(
    (acc, week) => acc + week.tasks.filter((t) => t.completed).length,
    0
  );
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{data.topic}</h1>
        <p className="text-muted-foreground">{data.duration}</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="mb-2 flex justify-between text-sm">
          <span>Progress</span>
          <span>{completedTasks}/{totalTasks} tasks ({Math.round(progressPercent)}%)</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Weeks - Expandable Sections */}
      <div className="space-y-4">
        {data.weeks.map((week, weekIndex) => {
          const isExpanded = expandedWeek === weekIndex;

          return (
            <div key={weekIndex} className="rounded-lg border">
              <button
                type="button"
                onClick={() => setExpandedWeek(isExpanded ? null : weekIndex)}
                className="flex w-full items-center justify-between p-4 hover:bg-accent"
              >
                <div>
                  <h3 className="font-semibold">Week {week.week}: {week.title}</h3>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t p-4">
                  {/* Tasks with Checkboxes */}
                  <div className="space-y-2">
                    {week.tasks.map((task, taskIndex) => (
                      <button
                        key={taskIndex}
                        type="button"
                        onClick={() => toggleTask(weekIndex, taskIndex)}
                        className="flex w-full items-start gap-3 rounded-lg p-2 hover:bg-accent"
                      >
                        {task.completed ? (
                          <CheckCircleIcon size={20} className="text-green-500" />
                        ) : (
                          <CircleIcon size={20} className="text-muted-foreground" />
                        )}
                        <span className={cn(task.completed && "line-through")}>
                          {task.task} ({task.duration})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tips Section */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
        <h3 className="mb-2 font-semibold">Tips for Success</h3>
        <ul className="list-disc list-inside text-sm">
          {data.tips.map((tip, i) => <li key={i}>{tip}</li>)}
        </ul>
      </div>
    </div>
  );
}

export const studyPlanArtifact = new Artifact<"study-plan", StudyPlanMetadata>({
  kind: "study-plan",
  description: "Structured study plan with progress tracking.",
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === "data-studyPlanDelta") {
      setArtifact((draft) => ({
        ...draft,
        content: streamPart.data,
        isVisible: true,
        status: "streaming",
      }));
    }
  },
  // Pass onSaveContent to enable persistence
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
        toast.success("Study plan copied!");
      },
    },
  ],
});
```

### How Checkbox Persistence Works

```
1. User clicks a task checkbox
         ↓
2. toggleTask() updates the data object
         ↓
3. onSaveContent(newJSON, debounce=true) is called
         ↓
4. Artifact system debounces (waits 2 seconds)
         ↓
5. Document saved to database via saveDocument()
         ↓
6. On page refresh, latest content loads from DB
```

The `onSaveContent` prop is provided by the Artifact system and handles:
- Debouncing rapid changes (prevents saving on every click)
- Persisting to the database
- Updating the document version history

## Data Flow Summary

```
1. User: "Quiz me on JavaScript"
           ↓
2. Orchestrator routes to quizMaster agent
           ↓
3. Agent writes metadata to dataStream:
   - data-id: "abc-123"
   - data-title: "Quiz: JavaScript"
   - data-kind: "flashcard"
   - data-clear: null
           ↓
4. DataStreamHandler receives metadata
   - Opens artifact panel
   - Sets artifact kind to "flashcard"
           ↓
5. Agent generates quiz with generateObject
           ↓
6. Agent writes content to dataStream:
   - data-flashcardDelta: "{...quiz JSON...}"
           ↓
7. DataStreamHandler finds flashcardArtifact
   - Calls onStreamPart handler
   - Updates useArtifact state
           ↓
8. FlashcardViewer renders the quiz UI
           ↓
9. Agent writes: data-finish
           ↓
10. Artifact status changes to "idle"
    Document saved to database
```

## Try It Out: Interactive Artifacts

Now test the full artifact experience! The same prompts from Chapter 3 now create rich, interactive artifacts:

### Flashcard Artifact (Quiz Master)
Click **"Quiz me on JavaScript fundamentals"** or try:
```
Quiz me on JavaScript fundamentals
Test my knowledge of React hooks
Create a quiz about CSS flexbox
Give me 5 hard questions about TypeScript
```

**What to observe:**
- An **artifact panel** opens on the right side of the screen
- Questions appear as interactive cards with clickable options
- Selecting an answer reveals if you're correct with an explanation
- Your score is tracked at the top
- The "Next Question" button advances through the quiz
- When complete, you can restart the quiz

### Study Plan Artifact (Planner)
Click **"Create a 2-week study plan for learning React"** or try:
```
Create a 2-week study plan for learning React
Help me plan how to learn TypeScript in 30 days
Build me a 1-week crash course on Node.js
```

**What to observe:**
- The artifact panel shows a structured study plan
- A **progress bar** shows overall completion
- Weeks are **expandable/collapsible** sections
- Each task has a **checkbox** you can click to mark complete
- **Progress persists!** Check some boxes, refresh the page, and they're still checked
- The completion percentage updates as you check tasks

### Artifact Features to Explore

1. **Real-time streaming**: Watch the artifact content appear as it's generated
2. **Persistence**: Your quiz scores and plan progress are saved
3. **Copy button**: Use the copy icon in the artifact header
4. **Refresh button**: Generate new questions on the same topic
5. **Close/reopen**: Close the artifact panel and reopen it from chat

### Comparing Chapter 3 vs Chapter 4

| Feature | Chapter 3 (Text) | Chapter 4 (Artifacts) |
|---------|------------------|----------------------|
| Quiz display | Markdown in chat | Interactive UI panel |
| Answer selection | Read spoiler tags | Click buttons |
| Score tracking | Manual counting | Automatic counter |
| Study plan | Static checklist | Clickable checkboxes |
| Progress | Lost on scroll | Persisted to database |

---

## Exercise: Add Progress Persistence

Make the study plan save checkbox state:

1. Add an `onSaveContent` prop to the viewer
2. When a checkbox is clicked, update the JSON and call save
3. The state will persist across page refreshes

## Key Concepts Recap

| Concept | Description |
|---------|-------------|
| Artifact | Rich UI component in dedicated panel |
| onStreamPart | Handler for incoming data deltas |
| data-*Delta | Stream type for artifact content |
| data-finish | Signal that streaming is complete |
| saveDocument | Persists artifact to database |

## What's Next

In Chapter 5, we'll review the complete architecture and explore ways to extend the system further.

## Files Changed in This Chapter

| File | Changes |
|------|---------|
| `lib/types.ts` | Added flashcardDelta, studyPlanDelta |
| `artifacts/flashcard/server.ts` | New - data types |
| `artifacts/flashcard/client.tsx` | New - artifact definition + viewer |
| `artifacts/study-plan/server.ts` | New - data types |
| `artifacts/study-plan/client.tsx` | New - artifact definition + viewer |
| `lib/ai/agents/quiz-master.ts` | Updated to create artifacts |
| `lib/ai/agents/planner.ts` | Updated to create artifacts |
| `components/artifact.tsx` | Registered new artifacts |
