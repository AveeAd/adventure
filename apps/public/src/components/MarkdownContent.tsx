import ReactMarkdown from 'react-markdown';

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-stone dark:prose-invert prose-headings:font-semibold prose-a:text-primary-700 dark:prose-a:text-primary-400 max-w-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
