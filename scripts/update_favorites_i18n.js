// Geçici script - FavoritesScreen güncellemeleri için
// Bu dosya kullanıldıktan sonra silinecek

const replacements = [
  // Error messages
  ['showError(\'Favoriler yüklenemedi\')', 'showError(t(\'favoritesScreen.failedToLoad\'))'],
  ['showError(\'Tarif bilgisi eksik\')', 'showError(t(\'favoritesScreen.recipeMissingInfo\'))'],
  ['showSuccess(\'Favorilerden kaldırıldı\')', 'showSuccess(t(\'favoritesScreen.removedFromFavorites\'))'],

  // Headers and titles
  ['            Favorilerim\n', '            {t(\'favoritesScreen.title\')}\n'],

  // Premium section
  ['              Premium Özellik\n', '              {t(\'favoritesScreen.premium.title\')}\n'],
  ['              Favori tariflerinizi kaydetmek ve yönetmek için Premium\'a geçin\n', '              {t(\'favoritesScreen.premium.description\')}\n'],
  ['                  Premium\'a Geç\n', '                  {t(\'favoritesScreen.premium.upgradeToPremium\')}\n'],

  // Search and filters
  ['placeholder=\'Favorilerde ara...\'', 'placeholder={t(\'favoritesScreen.searchPlaceholder\')}'],
  ['              Sıralama\n', '              {t(\'favoritesScreen.sorting\')}\n'],
  ['              Zorluk\n', '              {t(\'favoritesScreen.difficulty\')}\n'],

  // Sort options
  ['{ key: \'recent\', label: \'En Yeni\', icon: \'time\' }', '{ key: \'recent\', label: t(\'favoritesScreen.sortOptions.recent\'), icon: \'time\' }'],
  ['{ key: \'name\', label: \'İsim\', icon: \'text\' }', '{ key: \'name\', label: t(\'favoritesScreen.sortOptions.name\'), icon: \'text\' }'],
  ['{ key: \'cookingTime\', label: \'Süre\', icon: \'timer\' }', '{ key: \'cookingTime\', label: t(\'favoritesScreen.sortOptions.cookingTime\'), icon: \'timer\' }'],

  // Difficulty options
  ['{ key: \'all\', label: \'Tümü\' }', '{ key: \'all\', label: t(\'favoritesScreen.difficultyOptions.all\') }'],
  ['{ key: \'easy\', label: \'Kolay\' }', '{ key: \'easy\', label: t(\'favoritesScreen.difficultyOptions.easy\') }'],
  ['{ key: \'medium\', label: \'Orta\' }', '{ key: \'medium\', label: t(\'favoritesScreen.difficultyOptions.medium\') }'],
  ['{ key: \'hard\', label: \'Zor\' }', '{ key: \'hard\', label: t(\'favoritesScreen.difficultyOptions.hard\') }'],

  // Time and servings
  ['{item.cookingTime || 30} dk', '{item.cookingTime || 30} {t(\'favoritesScreen.minutes\')}'],
  ['{item.servings || 4} kişi', '{item.servings || 4} {t(\'favoritesScreen.servings\')}'],

  // Loading message
  ['            Favoriler yükleniyor...\n', '            {t(\'favoritesScreen.loadingFavorites\')}\n'],

  // EmptyState actions
  ['label: \'Filtreleri Temizle\'', 'label: t(\'favoritesScreen.clearFilters\')'],
  ['label: \'Tarif Keşfet\'', 'label: t(\'favoritesScreen.discoverRecipes\')']
];

console.log('FavoritesScreen.tsx i18n güncellemeleri hazır');
console.log('Toplam', replacements.length, 'değişiklik yapılacak');