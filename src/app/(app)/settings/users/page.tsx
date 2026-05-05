import { OrganizationProfile } from "@clerk/nextjs";

export default function Users() {
  if (process.env.DEMO_MODE === "1") {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-3xl">Users &amp; roles</h1>
        <p className="mt-1 text-sm text-forest-500">
          Manage who in your org can sign in, and what they can do.
        </p>
        <p className="text-sm text-forest-400">
          Demo mode: Clerk OrganizationProfile is disabled. In production this surface lets owners invite users and assign roles.
        </p>
        <ul className="text-sm space-y-1 text-forest-600">
          <li>Lucas Oliveira — owner — lucas@polico.example</li>
        </ul>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">Users &amp; roles</h1>
      <p className="mt-1 text-sm text-forest-500">
        Manage who in your org can sign in, and what they can do.
      </p>
      <OrganizationProfile />
    </div>
  );
}
