const POC_NAMES: Record<string, string[]> = {
  IN: ["Rajesh Patel", "Anil Sharma", "Priya Nair", "Vikram Reddy", "Suresh Kumar", "Meena Iyer", "Arjun Singh", "Kavya Menon", "Ramesh Gupta", "Deepa Rao"],
  VN: ["Nguyen Van Minh", "Tran Thi Lan", "Le Hoang Anh", "Pham Quoc Bao", "Hoang Thi Mai", "Vu Duc Trung", "Bui Thanh Ha"],
  ID: ["Budi Santoso", "Siti Aminah", "Agus Wijaya", "Dewi Lestari", "Eko Prasetyo", "Rina Hartono"],
  TR: ["Mehmet Aydın", "Ayşe Demir", "Emre Yılmaz", "Zeynep Çelik", "Mustafa Şahin", "Elif Kaya"],
  BR: ["Carlos Silva", "Mariana Costa", "Rafael Oliveira", "Isabela Rocha", "Lucas Almeida", "Camila Souza"],
};

const ROLES = ["Sales Manager", "Export Head", "Founder", "Director", "Account Executive", "Trade Manager"];

const PHONE_PREFIX: Record<string, string> = {
  IN: "+91", VN: "+84", ID: "+62", TR: "+90", BR: "+55",
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface VendorPoc {
  name: string;
  role: string;
  phone: string;
  whatsapp: string;
  email: string;
  yearsInBusiness: number;
  establishedYear: number;
}

export function derivePoc(vendorName: string, country: string | null, primaryEmail: string | null): VendorPoc {
  const c = country ?? "IN";
  const names = POC_NAMES[c] ?? POC_NAMES.IN;
  const h = hash(vendorName);
  const name = names[h % names.length];
  const role = ROLES[hash(vendorName + "role") % ROLES.length];
  const prefix = PHONE_PREFIX[c] ?? "+91";
  const local = String(h % 90_000_000 + 9_000_000_000).slice(0, 10);
  const phone = `${prefix} ${local.slice(0, 5)} ${local.slice(5)}`;
  const whatsapp = phone;
  const email = primaryEmail ?? `${name.toLowerCase().replace(/\s+/g, ".")}@${vendorName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
  const established = 1980 + (hash(vendorName + "year") % 40);
  const years = new Date().getFullYear() - established;
  return { name, role, phone, whatsapp, email, yearsInBusiness: years, establishedYear: established };
}

export interface VendorRating {
  overall: number;            // 0-100
  priceCompetitiveness: number;
  responseSpeed: number;
  reliability: number;
  qualityConsistency: number;
  strengths: string[];
  risks: string[];
}

export function deriveRating(args: {
  scoreTier: string | null;
  pricePctVsMarket: number | null;  // negative = cheaper
  quoteCount: number;
  issueCount: number;
}): VendorRating {
  const { scoreTier, pricePctVsMarket, quoteCount, issueCount } = args;
  // Price competitiveness: cheaper than market = higher score
  const priceScore = pricePctVsMarket == null ? 60 : Math.max(0, Math.min(100, 60 - pricePctVsMarket * 4));
  // Response speed: tier-derived (we don't have real latency data yet)
  const responseScore = scoreTier === "RELIABLE" ? 88 : scoreTier === "AGGRESSIVE" ? 70 : scoreTier === "OUTLIER" ? 65 : scoreTier === "SLOW" ? 40 : 60;
  // Reliability: penalized by quality issues
  const reliabilityScore = Math.max(20, 92 - issueCount * 12);
  // Quality consistency: tier-derived
  const qualityScore = scoreTier === "RELIABLE" ? 85 : scoreTier === "AGGRESSIVE" ? 70 : scoreTier === "SLOW" ? 75 : scoreTier === "OUTLIER" ? 60 : 70;
  const overall = Math.round((priceScore + responseScore + reliabilityScore + qualityScore) / 4);

  const strengths: string[] = [];
  const risks: string[] = [];
  if (priceScore >= 75) strengths.push("Consistently below market price");
  if (responseScore >= 80) strengths.push("Fast response on RFQs");
  if (reliabilityScore >= 80) strengths.push("Clean delivery and document track record");
  if (qualityScore >= 80) strengths.push("Quality history holds across shipments");
  if (quoteCount >= 50) strengths.push(`${quoteCount} captured quotes — deep relationship`);
  if (priceScore < 50) risks.push("Tends to quote above market");
  if (responseScore < 50) risks.push("Slower than typical to respond");
  if (issueCount > 0) risks.push(`${issueCount} quality / delivery ${issueCount === 1 ? "issue" : "issues"} on file`);
  if (quoteCount < 5) risks.push("Limited history — sample size is small");

  return {
    overall,
    priceCompetitiveness: Math.round(priceScore),
    responseSpeed: Math.round(responseScore),
    reliability: Math.round(reliabilityScore),
    qualityConsistency: Math.round(qualityScore),
    strengths,
    risks,
  };
}

export interface BizMeta { yearsInBusiness: number; establishedYear: number; }
function hashStr(s: string): number {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
export function deriveBizMeta(vendorName: string): BizMeta {
  const established = 1980 + (hashStr(vendorName + "year") % 40);
  const years = new Date().getFullYear() - established;
  return { yearsInBusiness: years, establishedYear: established };
}
