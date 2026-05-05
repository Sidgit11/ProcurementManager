export interface WhatsAppSendInput {
  to: string;
  body: string;
}

export interface WhatsAppCloud {
  send(input: WhatsAppSendInput): Promise<{ id: string; status: "queued" }>;
}

class MockCloud implements WhatsAppCloud {
  async send(input: WhatsAppSendInput) {
    console.info("[mock-whatsapp]", input.to, input.body.slice(0, 60));
    return { id: "mock-" + Date.now(), status: "queued" as const };
  }
}

class RealCloud implements WhatsAppCloud {
  async send(_input: WhatsAppSendInput): Promise<{ id: string; status: "queued" }> {
    throw new Error("WhatsApp Cloud API send not yet implemented (v1.1)");
  }
}

export const whatsapp: WhatsAppCloud =
  process.env.WHATSAPP_CLOUD_MODE === "real" ? new RealCloud() : new MockCloud();
