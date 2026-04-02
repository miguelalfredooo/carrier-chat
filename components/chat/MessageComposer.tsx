'use client';

import { useState, useRef } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import { designTokens as tokens } from '@/lib/design-tokens';

interface AttachmentFile {
  name: string;
  type: string;
  data: string; // base64
}

interface MessageComposerProps {
  onSend: (message: string, attachment?: AttachmentFile) => void;
  isLoading: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function MessageComposer({
  onSend,
  isLoading,
}: MessageComposerProps) {
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
    <div
      data-component="MessageComposer"
      className="flex flex-col gap-px"
      style={{
        backgroundColor: tokens.colors.gray[100],
        border: `1px solid ${tokens.colors.gray[300]}`,
        borderRadius: tokens.radius.lg,
        padding: 0,
      }}
    >
      {/* Attachment preview */}
      {attachment && (
        <div style={{ padding: tokens.spacing.md, paddingBottom: tokens.spacing.sm }}>
          <div
            className="flex items-center gap-2 rounded-full w-fit transition-colors"
            style={{
              backgroundColor: tokens.colors.gray[200],
              padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
            }}
          >
            <span className="text-sm" style={{ color: tokens.colors.gray[700] }}>
              📎 {attachment.name}
            </span>
            <button
              onClick={handleRemoveAttachment}
              style={{ color: tokens.colors.gray[600] }}
              className="hover:opacity-70 transition-opacity"
              aria-label="Remove attachment"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          className="text-sm"
          style={{
            padding: `0 ${tokens.spacing.md} ${tokens.spacing.sm} ${tokens.spacing.md}`,
            color: tokens.colors.red[500],
          }}
        >
          {error}
        </div>
      )}

      {/* Textarea section */}
      <div
        className="flex items-start gap-2"
        style={{
          padding: `${tokens.spacing.md} ${tokens.spacing.md} ${tokens.spacing.sm} ${tokens.spacing.md}`,
          gap: tokens.spacing.sm,
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a design question..."
          disabled={isLoading}
          rows={1}
          className="flex-1 bg-transparent text-sm outline-none disabled:opacity-50 resize-none"
          style={{
            color: tokens.colors.gray[900],
            placeholderColor: tokens.colors.gray[500],
            minHeight: '40px',
            maxHeight: '120px',
            overflowY: 'auto',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Action bar */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: tokens.spacing.md,
        }}
      >
        {/* Left side: Attachment button */}
        <div className="flex items-center gap-2">
          {/* Attachment button */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Attach image"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex items-center justify-center transition-colors"
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: tokens.colors.gray[100],
              border: `1px solid ${tokens.colors.gray[300]}`,
              borderRadius: tokens.radius.md,
              padding: tokens.spacing.sm,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
              color: tokens.colors.gray[600],
            }}
            title="Attach an image (JPEG, PNG, GIF, WebP - max 5MB)"
          >
            <Paperclip size={16} />
          </button>
        </div>

        {/* Right: Send button */}
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="flex items-center justify-center transition-colors"
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: !isLoading && input.trim() ? tokens.colors.yellow[400] : tokens.colors.gray[300],
            border: 'none',
            borderRadius: tokens.radius.md,
            padding: tokens.spacing.sm,
            cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.5 : 1,
            color: !isLoading && input.trim() ? tokens.colors.black : tokens.colors.gray[400],
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
