// Sample data for development and testing
export const SAMPLE_INGREDIENTS = [
  'Domates',
  'Soğan',
  'Sarımsak',
  'Biber',
  'Patlıcan',
  'Kabak',
  'Havuç',
  'Patates',
  'Et',
  'Tavuk',
  'Balık',
  'Pirinç',
  'Bulgur',
  'Makarna',
  'Yoğurt',
  'Peynir',
  'Yumurta',
  'Un',
  'Şeker',
  'Tuz',
];

export const SAMPLE_CUISINES = [
  'Türk Mutfağı',
  'İtalyan Mutfağı',
  'Çin Mutfağı',
  'Meksika Mutfağı',
  'Hint Mutfağı',
  'Fransız Mutfağı',
  'Japon Mutfağı',
  'Tayland Mutfağı',
];

export const DIFFICULTY_LEVELS = [
  'Kolay',
  'Orta',
  'Zor',
] as const;

export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];