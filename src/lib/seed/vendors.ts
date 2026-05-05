const COUNTRIES = ["IN", "VN", "ID", "TR", "BR"];
const NAMES = [
  "Patel Spices", "Mumbai Trading Co", "Saigon Exports", "Bali Coconut Co", "Anatolian Foods",
  "Polico Local Supplier", "Kerala Spice House", "Gujarat Pulses Ltd", "Hanoi Cashew Group", "Java Oil Mills",
  "Istanbul Dry Fruits", "São Paulo Imports", "Chennai Maritime", "Cochin Pepper Estate", "Delhi Wholesale",
  "Mekong Rice Co", "Lampung Coffee Group", "Izmir Spices", "Recife Trading", "Punjab Lentil Mills",
  "Andhra Spices Direct", "Hue Cashew Roasters", "Sumatra Palm Oil", "Marmara Hazelnuts", "Bahia Cacao Trade",
  "Tamil Pulses", "Cantho Rice", "Bandung Spice Hub", "Cappadocia Foods", "Minas Gerais Coffee",
  "Karnataka Coffee Estate", "Hai Phong Imports", "Surabaya Trading", "Adana Pepper Co", "Ribeirão Spices",
  "Madhya Spices", "Quy Nhon Foods", "Medan Coffee", "Mersin Sesame", "Goiás Soy Group",
  "Maharashtra Mills", "Da Nang Pepper", "Makassar Foods", "Antalya Olive", "Paraná Pulses",
  "Hyderabad Direct", "Phu Quoc Pepper", "Yogyakarta Spice Co", "Konya Wheat", "Mato Grosso Grains",
  "Telangana Trade", "Buon Ma Coffee", "Sulawesi Cacao", "Edirne Foods", "Espírito Santo Coffee",
  "Coimbatore Mills", "Dak Lak Cashew", "Aceh Spice Group", "Trabzon Hazelnut", "Pernambuco Trading",
  "Pune Pulses", "Tay Ninh Cassava", "Lombok Pepper", "Gaziantep Pistachio", "Ceará Cashew Co",
  "Kolkata Imports", "Lao Cai Spice", "Padang Trading", "Samsun Sunflower", "Rio Grande Trading",
  "Mysore Sandalwood", "Lang Son Foods", "Manado Coconut", "Şanlıurfa Cumin", "Bahia Spices",
  "Cochin Marine", "Vinh Long Rice", "Pekanbaru Palm", "Bursa Foods", "Curitiba Trade",
];

export function buildVendors(orgId: string) {
  return NAMES.map((n, i) => ({
    orgId,
    name: n,
    country: COUNTRIES[i % COUNTRIES.length],
    primaryContact: `contact${i}@${n.toLowerCase().replace(/\s+/g, "")}.com`,
    channelsDetected: i % 3 === 0 ? ["email", "whatsapp_export"] : ["whatsapp_export"],
  }));
}
