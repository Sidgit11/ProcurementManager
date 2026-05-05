import { recordRun } from "./runtime";

// v1.0 stub. Real shipment-data integration deferred to v1.1.
const STUB_CANDIDATES = [
  { name: "Coastal Spice Trade", country: "IN", reason: "Active exporter on US-bound shipments, similar SKUs to existing pool." },
  { name: "Mekong Pulse Hub",    country: "VN", reason: "High shipment frequency on chickpeas; absent from current vendor pool." },
];

export async function runVendorDiscovery(orgId: string) {
  return await recordRun({
    orgId,
    agentName: "vendor_discovery",
    proposedActions: STUB_CANDIDATES,
    decision: "pending",
  });
}
