"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Chapter } from "@/lib/course/chapters";

type ChapterNavProps = {
  currentIndex: number;
  chapters: Chapter[];
};

export function ChapterNav({ currentIndex, chapters }: ChapterNavProps) {
  const prev = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const next =
    currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  return (
    <nav className="mt-12 flex items-center justify-between border-t pt-8">
      {prev ? (
        <Button asChild variant="outline">
          <Link
            className="flex items-center gap-2"
            href={`/course/${prev.slug}`}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{prev.title}</span>
            <span className="sm:hidden">Previous</span>
          </Link>
        </Button>
      ) : (
        <div />
      )}

      {next ? (
        <Button asChild>
          <Link
            className="flex items-center gap-2"
            href={`/course/${next.slug}`}
          >
            <span className="hidden sm:inline">{next.title}</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      ) : (
        <Button asChild>
          <Link className="flex items-center gap-2" href="/">
            Start Building
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </nav>
  );
}
