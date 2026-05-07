export interface VendorSeed {
  name: string;
  country: string;        // ISO-2
  city?: string;
  primaryEmail: string;
  primarySkus: string[];  // SKUs this vendor realistically supplies
  pricingBias?: number;   // -0.10 (10% below market) to +0.15 (15% above market). Default 0.
  shipmentVolume: number; // relative weight 1-10 for quote frequency
}

export const POLICO_VENDORS: VendorSeed[] = [
  { name: "Al Afrikia For General Constructions & Exp.", country: "EG", city: "Cairo",     primaryEmail: "sales@alafrikia.com.eg",   primarySkus: ["DRIED-VEG-MIX", "ONION-FLAKES"],                  pricingBias: 0.00,  shipmentVolume: 10 },
  { name: "Xiangcheng Sanyou Food Co., Ltd.",            country: "CN", city: "Zhoukou",   primaryEmail: "export@sanyoufood.cn",     primarySkus: ["ONION-FLAKES", "DRIED-VEG-MIX"],                  pricingBias: -0.04, shipmentVolume: 9 },
  { name: "Calconut S.L.",                               country: "ES", city: "Almería",   primaryEmail: "trading@calconut.com",     primarySkus: ["ALMONDS-NPX"],                                    pricingBias: 0.10,  shipmentVolume: 8 },
  { name: "Flavour Foods Exp.",                          country: "IN", city: "Mumbai",    primaryEmail: "exports@flavourfoods.in",  primarySkus: ["CUMIN-SEEDS", "TURMERIC-WHOLE", "DRIED-VEG-MIX"], pricingBias: -0.05, shipmentVolume: 8 },
  { name: "Herbs Land Trading",                          country: "EG", city: "Cairo",     primaryEmail: "info@herbsland.eg",        primarySkus: ["DRIED-VEG-MIX", "CUMIN-SEEDS"],                   pricingBias: 0.02,  shipmentVolume: 6 },
  { name: "Jinxiang Jinxiyuan Food Co., Ltd.",           country: "CN", city: "Jinxiang",  primaryEmail: "sales@jinxiyuan.com",      primarySkus: ["ONION-FLAKES"],                                   pricingBias: -0.06, shipmentVolume: 6 },
  { name: "Tuan Minh Trading And Production Co., Ltd.",  country: "VN", city: "Lao Cai",   primaryEmail: "export@tuanminh.vn",       primarySkus: ["CASSIA-CINN"],                                    pricingBias: -0.03, shipmentVolume: 6 },
  { name: "Kirti Foods Pvt., Ltd.",                      country: "IN", city: "Unjha",     primaryEmail: "trade@kirtifoods.in",      primarySkus: ["TURMERIC-WHOLE", "CUMIN-SEEDS"],                  pricingBias: -0.04, shipmentVolume: 5 },
  { name: "Pooja Dehy Foods Pvt., Ltd.",                 country: "IN", city: "Mahuva",    primaryEmail: "exports@poojadehy.in",     primarySkus: ["DRIED-VEG-MIX", "ONION-FLAKES"],                  pricingBias: -0.02, shipmentVolume: 5 },
  { name: "Entegre Gida Sanayi Jsc",                     country: "TR", city: "Malatya",   primaryEmail: "export@entegregida.com",   primarySkus: ["APRICOTS-DRIED"],                                 pricingBias: 0.12,  shipmentVolume: 5 },
  { name: "Kirlioglu Tarim Urn. Tic. Ltd. Sti.",         country: "TR", city: "Malatya",   primaryEmail: "info@kirlioglu.com.tr",    primarySkus: ["APRICOTS-DRIED"],                                 pricingBias: 0.04,  shipmentVolume: 5 },
  { name: "Zhengzhou Donsen Foods Co., Ltd.",            country: "CN", city: "Zhengzhou", primaryEmail: "info@donsenfoods.cn",      primarySkus: ["DRIED-VEG-MIX", "ONION-FLAKES"],                  pricingBias: -0.05, shipmentVolume: 4 },
  { name: "Allimony Spice Exp. And Imp.",                country: "EG", city: "Cairo",     primaryEmail: "export@allimony-spice.eg", primarySkus: ["CUMIN-SEEDS", "TURMERIC-WHOLE"],                  pricingBias: 0.01,  shipmentVolume: 4 },
];

export function buildVendors(orgId: string) {
  return POLICO_VENDORS.map((v) => ({
    orgId,
    name: v.name,
    country: v.country,
    primaryContact: v.primaryEmail,
    channelsDetected: ["email", "whatsapp_export"] as string[],
  }));
}
