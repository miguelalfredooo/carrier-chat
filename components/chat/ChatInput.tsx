'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, X } from 'lucide-react';

interface AttachmentFile {
  name: string;
  type: string;
  data: string; // base64
}

interface ChatInputProps {
  onSend: (message: string, attachment?: AttachmentFile) => void;
  isLoading: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function ChatInput({
  onSend,
  isLoading,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<AttachmentFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim(), attachment || undefined);
      setInput('');
      setAttachment(null);
      setError(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      ((e.key === 'Enter' && !e.shiftKey) || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) &&
      !isLoading
    ) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Check file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(`Unsupported file type. Accepted: JPEG, PNG, GIF, WebP`);
      return;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File exceeds 5MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1]; // Remove data:image/...;base64, prefix
      setAttachment({
        name: file.name,
        type: file.type,
        data: base64Data,
      });
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsDataURL(file);

    // Reset input so selecting the same file again triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    setError(null);
  };

  return (
    <div className="flex flex-col gap-3 border-t border-gray-200 bg-white p-4">
      {/* File preview chip */}
      {attachment && (
        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1 w-fit">
          <span className="text-sm text-gray-700">{attachment.name}</span>
          <button
            onClick={handleRemoveAttachment}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Remove attachment"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {/* Input and send button */}
      <div className="flex gap-2">
        {/* Paperclip button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:border-gray-400 transition-colors"
          title="Attach an image (JPEG, PNG, GIF, WebP - max 5MB)"
        >
          <Paperclip size={16} />
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Attach image"
        />

        {/* Text input */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a design question... (Shift+Enter for newline, Ctrl+Enter to send)"
          disabled={isLoading}
          rows={1}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none placeholder:text-gray-500 disabled:bg-gray-100 disabled:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 resize-none"
          style={{
            minHeight: '40px',
            maxHeight: '120px',
            overflowY: 'auto',
          }}
        />

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          size="sm"
          className="gap-2 self-end"
        >
          <Send size={16} />
          Send
        </Button>
      </div>
    </div>
  );
}
