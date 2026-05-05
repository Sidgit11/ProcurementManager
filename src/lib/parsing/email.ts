export interface ParsedEmail {
  subject: string;
  from: string;
  bodyText: string;
  sentAt: Date;
  attachments: never[];
}

export function parseRfc822(_raw: string): ParsedEmail {
  throw new Error("parseRfc822 is a v1.1 stub. Use the mock Gmail adapter for the prototype.");
}
