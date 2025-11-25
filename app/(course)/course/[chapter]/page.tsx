import { notFound } from "next/navigation";
import { ChapterNav } from "@/components/course/chapter-nav";
import { ProseContent } from "@/components/course/prose-content";
import {
  getAllChapters,
  getAllSlugs,
  getChapter,
  getChapterIndex,
} from "@/lib/course/chapters";

type Props = {
  params: Promise<{ chapter: string }>;
};

export function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({
    chapter: slug,
  }));
}

export async function generateMetadata({ params }: Props) {
  const { chapter: slug } = await params;
  const data = await getChapter(slug);

  if (!data) {
    return { title: "Chapter Not Found" };
  }

  const prefix =
    data.displayNumber !== undefined ? `Chapter ${data.displayNumber}: ` : "";
  return {
    title: data.title,
    description: `${prefix}${data.title} - AI Agents Workshop`,
  };
}

export default async function ChapterPage({ params }: Props) {
  const { chapter: slug } = await params;
  const chapterData = await getChapter(slug);

  if (!chapterData) {
    notFound();
  }

  const chapters = getAllChapters();
  const currentIndex = getChapterIndex(slug);

  // Filter to only numbered chapters for progress indicator
  const numberedChapters = chapters.filter(
    (c) => c.displayNumber !== undefined
  );
  const isPrerequisites = chapterData.displayNumber === undefined;

  return (
    <article>
      {/* Progress indicator - only for numbered chapters */}
      {!isPrerequisites && (
        <div className="mb-6 flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            Chapter {(chapterData.displayNumber ?? 0) + 1} of{" "}
            {numberedChapters.length}
          </span>
          <div className="flex gap-1">
            {numberedChapters.map((c) => (
              <div
                className={`h-2 w-8 rounded-full ${
                  (c.displayNumber ?? 0) <= (chapterData.displayNumber ?? -1)
                    ? "bg-primary"
                    : "bg-muted"
                }`}
                key={c.slug}
              />
            ))}
          </div>
        </div>
      )}

      {/* Prerequisites badge */}
      {isPrerequisites && (
        <div className="mb-6">
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-muted-foreground text-sm">
            Pre-course setup
          </span>
        </div>
      )}

      {/* Main content */}
      <ProseContent content={chapterData.content} />

      {/* Navigation */}
      <ChapterNav chapters={chapters} currentIndex={currentIndex} />
    </article>
  );
}
