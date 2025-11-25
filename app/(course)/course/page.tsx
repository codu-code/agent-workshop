import { BookOpen } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllChapters } from "@/lib/course/chapters";

export default function CoursePage() {
  const chapters = getAllChapters();

  return (
    <div>
      <h1 className="mb-2 font-bold text-3xl">AI Agents Workshop</h1>
      <p className="mb-8 text-muted-foreground">
        Build a multi-agent AI chatbot with tools, agents, and custom artifacts.
        This workshop covers everything from basic tool calling to creating
        interactive artifacts.
      </p>

      <div className="grid gap-4">
        {chapters.map((chapter) => (
          <Link href={`/course/${chapter.slug}`} key={chapter.slug}>
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle className="flex items-center gap-4">
                  {chapter.displayNumber !== undefined ? (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                      {chapter.displayNumber}
                    </span>
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <BookOpen className="h-5 w-5" />
                    </span>
                  )}
                  <span>{chapter.title}</span>
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-lg border bg-muted/50 p-4">
        <h2 className="mb-2 font-semibold">Workshop Duration</h2>
        <p className="text-muted-foreground text-sm">
          Approximately 2-3 hours. Each chapter builds on the previous one, so
          we recommend following them in order.
        </p>
      </div>
    </div>
  );
}
