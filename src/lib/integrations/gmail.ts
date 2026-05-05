export interface RawEmail {
  id: string;
  from: string;
  subject: string;
  bodyText: string;
  sentAt: Date;
}

export interface GmailAdapter {
  listMessagesSince(cursor: string | null): Promise<{ messages: RawEmail[]; nextCursor: string | null }>;
}

class MockGmailAdapter implements GmailAdapter {
  async listMessagesSince(_cursor: string | null) {
    return { messages: [] as RawEmail[], nextCursor: null };
  }
}

class RealGmailAdapter implements GmailAdapter {
  async listMessagesSince(_cursor: string | null): Promise<{ messages: RawEmail[]; nextCursor: string | null }> {
    throw new Error("Real Gmail OAuth integration not yet implemented (v1.1)");
  }
}

export const gmail: GmailAdapter =
  process.env.GMAIL_MODE === "real" ? new RealGmailAdapter() : new MockGmailAdapter();
