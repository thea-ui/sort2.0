type ClassValue = string | false | null | undefined | ClassValue[];

/**
 * Minimal class-name joiner (the reference stack's `cn`). Accepts nested arrays
 * so conditional class groups stay readable without pulling in a dependency.
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) out.push(nested);
    } else {
      out.push(input);
    }
  }
  return out.join(' ');
}
