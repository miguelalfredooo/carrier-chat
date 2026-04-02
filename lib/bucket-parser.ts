import { ChatMessage, ProjectBucket, BucketUpdate } from './chat-types';

const BUCKET_DELIMITER = '\n---buckets\n';

/**
 * Parse bucket updates from a single message's content.
 * Returns the visible content (without bucket data) and any bucket updates.
 */
export function parseBucketBlock(content: string): {
  contentWithoutBuckets: string;
  updates: BucketUpdate[];
} {
  const delimiterIndex = content.indexOf(BUCKET_DELIMITER);

  if (delimiterIndex === -1) {
    return { contentWithoutBuckets: content, updates: [] };
  }

  // Bucket block sits between ---buckets and either ---suggestions or end of string
  const contentBefore = content.slice(0, delimiterIndex);
  const afterBuckets = content.slice(delimiterIndex + BUCKET_DELIMITER.length);

  // The bucket block might be followed by ---suggestions
  const suggestionsIndex = afterBuckets.indexOf('\n---suggestions\n');
  const bucketJson =
    suggestionsIndex === -1
      ? afterBuckets.trim()
      : afterBuckets.slice(0, suggestionsIndex).trim();

  // Rebuild content without the bucket block
  const contentAfterBuckets =
    suggestionsIndex === -1
      ? ''
      : afterBuckets.slice(suggestionsIndex);
  const contentWithoutBuckets = (contentBefore + contentAfterBuckets).trimEnd();

  let updates: BucketUpdate[] = [];
  try {
    const parsed = JSON.parse(bucketJson);
    if (Array.isArray(parsed)) {
      updates = parsed.filter(
        (item: any) => item.id && item.label && item.insight
      );
    }
  } catch {
    // Malformed JSON — skip silently, don't break the chat
  }

  return { contentWithoutBuckets, updates };
}

/**
 * Scan all messages and accumulate bucket state.
 * Pure function — safe to call on every render.
 */
export function buildBucketsFromMessages(messages: ChatMessage[]): ProjectBucket[] {
  const bucketMap = new Map<string, ProjectBucket>();

  for (const message of messages) {
    if (message.role === 'user') continue;

    const { updates } = parseBucketBlock(message.content);

    for (const update of updates) {
      const existing = bucketMap.get(update.id);
      if (existing) {
        existing.insights.push({
          text: update.insight,
          messageId: message.id,
        });
        // Update label in case the AI refines it
        existing.label = update.label;
      } else {
        bucketMap.set(update.id, {
          id: update.id,
          label: update.label,
          insights: [{ text: update.insight, messageId: message.id }],
        });
      }
    }
  }

  return Array.from(bucketMap.values());
}

/**
 * Strip bucket data from content for display.
 * Used by MessageList to clean content before rendering.
 */
export function stripBucketBlock(content: string): string {
  return parseBucketBlock(content).contentWithoutBuckets;
}
