import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type Chapter = {
  slug: string;
  title: string;
  file: string;
  displayNumber?: number; // undefined for prerequisites
};

export type ChapterWithContent = Chapter & {
  content: string;
};

const CHAPTERS: Chapter[] = [
  { slug: "prerequisites", title: "Prerequisites", file: "PREREQUISITES.md" },
  {
    slug: "0",
    title: "The Starting Point",
    file: "CHAPTER-0.md",
    displayNumber: 0,
  },
  {
    slug: "1",
    title: "Adding Your First Tool",
    file: "CHAPTER-1.md",
    displayNumber: 1,
  },
  {
    slug: "2",
    title: "Your First Agent",
    file: "CHAPTER-2.md",
    displayNumber: 2,
  },
  {
    slug: "3",
    title: "Multi-Agent Orchestration",
    file: "CHAPTER-3.md",
    displayNumber: 3,
  },
  {
    slug: "4",
    title: "Custom Artifacts",
    file: "CHAPTER-4.md",
    displayNumber: 4,
  },
  {
    slug: "5",
    title: "Complete Architecture",
    file: "CHAPTER-5.md",
    displayNumber: 5,
  },
];

export async function getChapter(
  slug: string
): Promise<ChapterWithContent | null> {
  const chapter = CHAPTERS.find((c) => c.slug === slug);
  if (!chapter) {
    return null;
  }

  try {
    const filePath = join(process.cwd(), chapter.file);
    const content = await readFile(filePath, "utf-8");
    return { ...chapter, content };
  } catch {
    return null;
  }
}

export function getAllChapters(): Chapter[] {
  return CHAPTERS;
}

export function getTotalChapters(): number {
  return CHAPTERS.length;
}

export function getChapterIndex(slug: string): number {
  return CHAPTERS.findIndex((c) => c.slug === slug);
}

export function getAllSlugs(): string[] {
  return CHAPTERS.map((c) => c.slug);
}
