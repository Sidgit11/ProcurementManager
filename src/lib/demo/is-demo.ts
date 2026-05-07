export const isDemo = () => process.env.DEMO_MODE === "1";

// Stable UUIDs used in demo seed (so URL params work across page navigations)
export const DEMO_ORG = {
  id: "00000000-0000-0000-0000-000000000001",
  clerkOrgId: "demo-org",
  name: "Polico Comercial de Alimentos",
  homeCurrency: "USD" as const,
  homePort: "BR-NVT" as const,
  settings: {} as Record<string, unknown>,
  createdAt: new Date(),
};

export const DEMO_USER = {
  id: "00000000-0000-0000-0000-000000000002",
  orgId: DEMO_ORG.id,
  clerkUserId: "demo-user",
  email: "lucas@polico.example",
  name: "Lucas Oliveira",
  role: "owner",
  createdAt: new Date(),
};
