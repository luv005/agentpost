import { nanoid } from "nanoid";

export function generateId(size = 21): string {
  return nanoid(size);
}

export function generateEmailLocal(size = 8): string {
  return `agent-${nanoid(size).toLowerCase()}`;
}

export function generateApiKey(): string {
  return `ask_${nanoid(40)}`;
}
