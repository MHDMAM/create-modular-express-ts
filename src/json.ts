const PRINT_WIDTH = 120;

/**
 * Serializes JSON the way Prettier formats the template's config files: objects expanded, arrays of primitives kept
 * on one line when they fit within the print width.
 */
export function formatJson(value: unknown): string {
  return serialize(value, '', '') + '\n';
}

function serialize(value: unknown, indent: string, prefix: string): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const primitives = value.every((v) => v === null || typeof v !== 'object');
    if (primitives) {
      const inline = `[${value.map((v) => JSON.stringify(v)).join(', ')}]`;
      if (indent.length + prefix.length + inline.length + 1 <= PRINT_WIDTH) return inline;
    }
    const inner = indent + '  ';
    return `[\n${value.map((v) => inner + serialize(v, inner, '')).join(',\n')}\n${indent}]`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    const inner = indent + '  ';
    const lines = entries.map(([k, v]) => {
      const key = `${JSON.stringify(k)}: `;
      return inner + key + serialize(v, inner, key);
    });
    return `{\n${lines.join(',\n')}\n${indent}}`;
  }
  return JSON.stringify(value);
}
