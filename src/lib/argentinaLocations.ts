// Provincias y localidades de Argentina.
// Foco en Mendoza (mercado principal) + opciones generales para el resto.
// Si una localidad no está en la lista, el pro puede tipear "Otra" y escribirla libremente.

export const ARGENTINA_LOCATIONS: Record<string, string[]> = {
  "Buenos Aires": [
    "La Plata",
    "Mar del Plata",
    "Bahía Blanca",
    "Tandil",
    "Quilmes",
    "Lomas de Zamora",
    "Morón",
    "San Isidro",
    "Tigre",
    "Pilar",
    "Otra",
  ],
  "CABA": ["Ciudad Autónoma de Buenos Aires"],
  "Catamarca": ["San Fernando del Valle de Catamarca", "Otra"],
  "Chaco": ["Resistencia", "Sáenz Peña", "Otra"],
  "Chubut": ["Rawson", "Comodoro Rivadavia", "Puerto Madryn", "Trelew", "Otra"],
  "Córdoba": ["Córdoba Capital", "Villa Carlos Paz", "Río Cuarto", "Villa María", "Otra"],
  "Corrientes": ["Corrientes Capital", "Goya", "Otra"],
  "Entre Ríos": ["Paraná", "Concordia", "Gualeguaychú", "Otra"],
  "Formosa": ["Formosa Capital", "Otra"],
  "Jujuy": ["San Salvador de Jujuy", "Otra"],
  "La Pampa": ["Santa Rosa", "Otra"],
  "La Rioja": ["La Rioja Capital", "Otra"],
  "Mendoza": [
    "Capital",
    "Godoy Cruz",
    "Guaymallén",
    "Las Heras",
    "Luján de Cuyo",
    "Maipú",
    "San Martín",
    "Rivadavia",
    "Junín",
    "San Rafael",
    "General Alvear",
    "Malargüe",
    "Tunuyán",
    "Tupungato",
    "San Carlos",
    "Lavalle",
    "Santa Rosa",
    "La Paz",
    "Otra",
  ],
  "Misiones": ["Posadas", "Oberá", "Eldorado", "Otra"],
  "Neuquén": ["Neuquén Capital", "San Martín de los Andes", "Otra"],
  "Río Negro": ["Viedma", "San Carlos de Bariloche", "General Roca", "Otra"],
  "Salta": ["Salta Capital", "Otra"],
  "San Juan": ["San Juan Capital", "Otra"],
  "San Luis": ["San Luis Capital", "Villa Mercedes", "Otra"],
  "Santa Cruz": ["Río Gallegos", "El Calafate", "Otra"],
  "Santa Fe": ["Santa Fe Capital", "Rosario", "Rafaela", "Otra"],
  "Santiago del Estero": ["Santiago del Estero Capital", "Otra"],
  "Tierra del Fuego": ["Ushuaia", "Río Grande", "Otra"],
  "Tucumán": ["San Miguel de Tucumán", "Otra"],
};

export const PROVINCES = Object.keys(ARGENTINA_LOCATIONS).sort();

export const getLocalities = (province: string): string[] =>
  ARGENTINA_LOCATIONS[province] || [];
