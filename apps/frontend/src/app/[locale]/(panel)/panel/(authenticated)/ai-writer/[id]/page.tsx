import { WriterPage } from "@/components/writer/writer-page";

/** One of the account's own conversations with the AI writer. */
export default async function WriterConversation({ params }: PageProps<"/[locale]/panel/ai-writer/[id]">) {
  const { id } = await params;
  return <WriterPage conversationId={id} />;
}
