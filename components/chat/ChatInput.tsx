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

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(`Unsupported file type. Accepted: JPEG, PNG, GIF, WebP`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File exceeds 5MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
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

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    setError(null);
  };

  return (
    <div className="flex flex-col gap-3 bg-white p-4">
      {attachment && (
        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1 w-fit">
          <span className="text-sm text-gray-700">📎 {attachment.name}</span>
          <button
            onClick={handleRemoveAttachment}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Remove attachment"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a design question..."
        disabled={isLoading}
        rows={1}
        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm outline-none placeholder:text-gray-500 disabled:bg-gray-100 disabled:text-gray-500 focus:bg-white focus:border-gray-400 focus:ring-1 focus:ring-gray-200 resize-none"
        style={{
          minHeight: '40px',
          maxHeight: '120px',
          overflowY: 'auto',
        }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Attach image"
      />

      {/* Icons row: attachment left, submit right */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Attach an image (JPEG, PNG, GIF, WebP - max 5MB)"
        >
          <Paperclip size={16} />
        </button>

        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
