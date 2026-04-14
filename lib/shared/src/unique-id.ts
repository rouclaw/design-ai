import ShortUniqueId from "short-unique-id";

// Using 5 length unique IDs means a ~4e-8 probability for collision within 1000
// nodes, which should be sufficient for our use case.
const { randomUUID } = new ShortUniqueId({ length: 5 });

/**
 * Generates a unique ID for nodes in .pen documents.
 */
export function createUniqueId(): string {
  return randomUUID();
}
