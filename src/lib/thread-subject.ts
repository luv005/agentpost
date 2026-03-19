const REPLY_PREFIX = /^(re|fwd?|aw|sv|vs|ref|rif|r)\s*(\[\d+\])?\s*:\s*/i;

export function normalizeSubject(subject: string): string {
  let s = subject.trim();
  // Strip all Re:/Fwd:/etc prefixes recursively
  let prev = "";
  while (prev !== s) {
    prev = s;
    s = s.replace(REPLY_PREFIX, "");
  }
  // Normalize whitespace
  return s.replace(/\s+/g, " ").trim();
}
