import { OrganizationProfile } from "@clerk/nextjs";

export default function Users() {
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">Users & roles</h1>
      <OrganizationProfile />
    </div>
  );
}
