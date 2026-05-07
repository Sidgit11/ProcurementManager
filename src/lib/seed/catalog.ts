export const POLICO_CATALOG = [
  { sku: "DRIED-VEG-MIX",    name: "Dried Mixed Vegetables",      category: "dried_vegetables", defaultUnit: "kg" },
  { sku: "ONION-FLAKES",     name: "Dehydrated Onion Flakes",     category: "dried_vegetables", defaultUnit: "kg" },
  { sku: "CASSIA-CINN",      name: "Cassia Cinnamon Sticks",      category: "spices",           defaultUnit: "kg" },
  { sku: "APRICOTS-DRIED",   name: "Dried Apricots #1 (Turkish)", category: "dried_fruit",      defaultUnit: "kg" },
  { sku: "ALMONDS-NPX",      name: "Almonds NPX (shelled)",       category: "nuts",             defaultUnit: "kg" },
  { sku: "CUMIN-SEEDS",      name: "Cumin Seeds Whole",           category: "spices",           defaultUnit: "kg" },
  { sku: "TURMERIC-WHOLE",   name: "Turmeric Whole",              category: "spices",           defaultUnit: "kg" },
];

export const BASE_PRICES_USD_PER_KG: Record<string, number> = {
  "DRIED-VEG-MIX":  3.20,
  "ONION-FLAKES":   3.80,
  "CASSIA-CINN":    2.40,
  "APRICOTS-DRIED": 4.20,
  "ALMONDS-NPX":    6.50,
  "CUMIN-SEEDS":    4.10,
  "TURMERIC-WHOLE": 1.95,
};
