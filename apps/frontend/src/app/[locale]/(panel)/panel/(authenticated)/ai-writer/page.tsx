import { WriterPage } from "@/components/writer/writer-page";

/** A new conversation with the AI writer; `?news=<id>` links it to a news item, so proposals can be applied there. */
export default async function NewWriterConversation({ searchParams }: PageProps<"/[locale]/panel/ai-writer">) {
  const { news } = await searchParams;
  return <WriterPage newsId={typeof news === "string" ? news : undefined} />;
}
