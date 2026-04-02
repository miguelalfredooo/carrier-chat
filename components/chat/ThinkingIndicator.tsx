'use client';

export function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="max-w-2xl">
        <div className="bg-white text-black rounded-2xl px-4 py-2 text-sm flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0s' }} />
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
}
