import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span ?? []), 'className', 'style'],
    div: [...(defaultSchema.attributes?.div ?? []), 'className', 'style'],
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'className'],
  },
};

/** Renders card front/back text with basic Markdown, inline HTML, and LaTeX ($...$ / $$...$$) support. */
export default function CardContent({ text }: { text: string }) {
  return (
    <div className="card-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex, [rehypeSanitize, schema]]}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
