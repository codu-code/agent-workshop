import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: {
    template: "%s | AI Agents Workshop",
    default: "AI Agents Workshop",
  },
  description:
    "Build a multi-agent AI chatbot with tools, agents, and custom artifacts.",
};

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link
            className="font-semibold transition-colors hover:text-primary"
            href="/course"
          >
            AI Agents Workshop
          </Link>
          <Button asChild size="sm" variant="outline">
            <Link href="/">Back to Chat</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
