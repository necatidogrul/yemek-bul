#!/usr/bin/env node

/**
 * Environment Switcher Script
 *
 * Bu script ile farklı ortamlarda test edebilirsiniz:
 * - development: 100 kredi, admin panel açık
 * - testing: 1 kredi, production benzeri davranış
 * - production: 1 kredi, tam güvenlik
 */

const fs = require("fs");
const path = require("path");

const environments = {
  dev: "development",
  test: "testing",
  prod: "production",
};

const arg = process.argv[2];
const env = environments[arg];

if (!env) {
  console.log("❌ Geçersiz environment. Kullanım:");
  console.log(
    "  npm run env:dev     - Development ortamı (100 kredi, admin panel)"
  );
  console.log(
    "  npm run env:test    - Test ortamı (production benzeri, 1 kredi)"
  );
  console.log("  npm run env:prod    - Production ortamı (tam güvenlik)");
  process.exit(1);
}

// Environment dosyasını güncelle
const envPath = path.join(__dirname, "..", ".env");
let envContent = "";

// Mevcut .env dosyasını oku
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, "utf8");
}

// EXPO_PUBLIC_ENVIRONMENT değerini güncelle veya ekle
const lines = envContent.split("\n");
let found = false;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith("EXPO_PUBLIC_ENVIRONMENT=")) {
    lines[i] = `EXPO_PUBLIC_ENVIRONMENT=${env}`;
    found = true;
    break;
  }
}

if (!found) {
  lines.push(`EXPO_PUBLIC_ENVIRONMENT=${env}`);
}

// .env dosyasını yaz
fs.writeFileSync(envPath, lines.join("\n"));

console.log(`✅ Environment değiştirildi: ${env}`);
console.log("");

switch (env) {
  case "development":
    console.log("🔧 DEVELOPMENT MODU:");
    console.log("  - 100 kredi ile başlar");
    console.log("  - Admin panel aktif (7x tap)");
    console.log("  - Debug logları açık");
    console.log("  - Mock servisler aktif");
    break;

  case "testing":
    console.log("🧪 TEST MODU:");
    console.log("  - 1 kredi ile başlar (production benzeri)");
    console.log("  - Admin panel KAPALI");
    console.log("  - Debug logları kapalı");
    console.log("  - Gerçek servisler");
    break;

  case "production":
    console.log("🚀 PRODUCTION MODU:");
    console.log("  - 1 kredi ile başlar");
    console.log("  - Admin panel tamamen KAPALI");
    console.log("  - Tam güvenlik aktif");

    break;
}

console.log("");
console.log("📱 Uygulamayı yeniden başlatın:");
console.log("  npx expo start --clear");
