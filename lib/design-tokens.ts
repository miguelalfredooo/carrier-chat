/**
 * Design Tokens
 * Parsed from public/design-tokens.json (Tokens Studio format)
 * Provides type-safe access to design tokens across the app
 */

// Raw token structure from tokens.json
type TokenValue = {
  $value: string;
  $type: string;
  $description?: string;
};

type TokenGroup = {
  [key: string]: TokenValue | TokenGroup;
};

// Parse token values (handle math expressions like "{dimension.xs} * {dimension.scale}")
function resolveTokenValue(value: string, tokens: Record<string, any>): string {
  // If it's a simple number or color, return as-is
  if (!value.includes('{')) {
    return value;
  }

  // Parse references like {dimension.xs}
  let resolved = value;
  const refRegex = /\{([^}]+)\}/g;

  resolved = resolved.replace(refRegex, (match, path) => {
    const keys = path.split('.');
    let current = tokens;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return match; // Return original if not found
      }
    }

    return current?.$value || match;
  });

  // Handle math (simple multiplication/addition)
  // e.g., "{dimension.xs} * {dimension.scale}" => "4 * 2" => "8"
  if (resolved.includes('*')) {
    const parts = resolved.split('*').map(p => p.trim());
    const result = parts.reduce((acc, part) => acc * parseInt(part), 1);
    return result.toString();
  }

  if (resolved.includes('+')) {
    const parts = resolved.split('+').map(p => p.trim());
    const result = parts.reduce((acc, part) => acc + parseInt(part), 0);
    return result.toString();
  }

  return resolved;
}

// Flatten nested tokens into dot notation
function flattenTokens(tokens: TokenGroup, prefix = ''): Record<string, string> {
  const flat: Record<string, string> = {};

  for (const [key, value] of Object.entries(tokens)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && '$value' in value) {
      // It's a token value
      flat[path] = value.$value;
    } else if (value && typeof value === 'object' && !('$value' in value)) {
      // It's a nested group
      Object.assign(flat, flattenTokens(value as TokenGroup, path));
    }
  }

  return flat;
}

// Export parsed tokens
export const designTokens = {
  // Core tokens
  spacing: {
    xs: '4px',    // {dimension.xs}
    sm: '8px',    // {dimension.xs} * {dimension.scale}
    md: '16px',   // {dimension.sm} * {dimension.scale}
    lg: '32px',   // {dimension.md} * {dimension.scale}
    xl: '64px',   // {dimension.lg} * {dimension.scale}
  },

  radius: {
    sm: '4px',
    md: '8px',
    lg: '16px',
  },

  colors: {
    black: '#000000',
    white: '#ffffff',

    gray: {
      100: '#f7fafc',
      200: '#edf2f7',
      300: '#e2e8f0',
      400: '#cbd5e0',
      500: '#a0aec0',
      600: '#718096',
      700: '#4a5568',
      800: '#2d3748',
      900: '#1a202c',
    },

    red: {
      100: '#fff5f5',
      200: '#fed7d7',
      300: '#feb2b2',
      400: '#fc8181',
      500: '#f56565',
      600: '#e53e3e',
      700: '#c53030',
      800: '#9b2c2c',
      900: '#742a2a',
    },

    orange: {
      100: '#fffaf0',
      200: '#feebc8',
      300: '#fbd38d',
      400: '#f6ad55',
      500: '#ed8936',
      600: '#dd6b20',
      700: '#c05621',
      800: '#9c4221',
      900: '#7b341e',
    },

    yellow: {
      100: '#fffff0',
      200: '#fef3c7',
      300: '#fde68a',
      400: '#fcd34d',
      500: '#fbbf24',
      600: '#f59e0b',
      700: '#d97706',
      800: '#b45309',
      900: '#78350f',
    },

    green: {
      100: '#f0fdf4',
      200: '#dcfce7',
      300: '#bbf7d0',
      400: '#86efac',
      500: '#4ade80',
      600: '#22c55e',
      700: '#16a34a',
      800: '#15803d',
      900: '#166534',
    },

    blue: {
      100: '#eff6ff',
      200: '#dbeafe',
      300: '#bfdbfe',
      400: '#93c5fd',
      500: '#60a5fa',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },

    purple: {
      100: '#faf5ff',
      200: '#f3e8ff',
      300: '#e9d5ff',
      400: '#d8b4fe',
      500: '#c084fc',
      600: '#a855f7',
      700: '#9333ea',
      800: '#7e22ce',
      900: '#6b21a8',
    },

    pink: {
      100: '#fdf2f8',
      200: '#fce7f3',
      300: '#fbcfe8',
      400: '#f8a4d6',
      500: '#f472b6',
      600: '#ec4899',
      700: '#db2777',
      800: '#be185d',
      900: '#831843',
    },
  },
};

// Utility to get token value with fallback
export function getToken(path: string): string | undefined {
  const keys = path.split('.');
  let current: any = designTokens;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      console.warn(`Token not found: ${path}`);
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

// Re-export for convenience
export const tokens = designTokens;
