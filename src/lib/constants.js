export const BRANDS = [
  { id: "clap-chicken",  name: "Clap Chicken",        accent: "var(--br-cc)" },
  { id: "olivia",        name: "Olivia",               accent: "var(--br-ol)" },
  { id: "ciervos",       name: "Ciervos y Margaritas", accent: "var(--br-cm)" },
  { id: "clap-burger",   name: "Clap Burger",          accent: "var(--br-cb)" },
];

export const getBrand = id => BRANDS.find(b => b.id === id) ?? BRANDS[0];

export const STATUS_LIST = ["En planificación", "En construcción", "Entregada"];

export const STATUS_TOKEN = {
  "En planificación": "info",
  "En construcción":  "warn",
  "Entregada":        "ok",
};

export const DEFAULT_ITEMS = [
  "Plano general",
  "Plano fachada",
  "Plano materiales",
  "Planos cortes",
  "Plano hidrosanitario",
  "Plano eléctrico",
  "Plano extracción",
  "Plano RCI",
  "Renders",
];

export const ITEM_STATES = [
  { key: "Diseñado",       token: "info" },
  { key: "En aprobación",  token: "warn" },
  { key: "Aprobado",       token: "ok"   },
];
