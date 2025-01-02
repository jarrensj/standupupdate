import fs from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';

export default function PrivacyPolicyPage() {
  const filePath = path.join(process.cwd(), 'content', 'privacy-policy.md');
  const content = fs.readFileSync(filePath, 'utf8');

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
      <ReactMarkdown>{content}</ReactMarkdown>
    </main>
  );
}
