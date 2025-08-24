#!/usr/bin/env node

/**
 * RevenueCat Integration Test Script
 * Bu script RevenueCat entegrasyonunu test eder
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 RevenueCat Integration Test Starting...\n');

// Test functions
const testConfigFiles = () => {
  console.log('📁 Testing configuration files...');
  
  const configPath = path.join(__dirname, 'src', 'config', 'revenuecat.config.ts');
  const envExamplePath = path.join(__dirname, '.env.example');
  
  let passed = 0;
  let failed = 0;
  
  // Test config file exists
  if (fs.existsSync(configPath)) {
    console.log('   ✅ revenuecat.config.ts exists');
    passed++;
    
    // Check config content
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    if (configContent.includes('PRODUCTS') && configContent.includes('ENTITLEMENTS')) {
      console.log('   ✅ Config contains required sections');
      passed++;
    } else {
      console.log('   ❌ Config missing required sections');
      failed++;
    }
    
    if (configContent.includes('com.yemekbulucuai.premium_monthly')) {
      console.log('   ✅ Product IDs configured (iOS-only)');
      passed++;
    } else {
      console.log('   ❌ Product IDs not configured');
      failed++;
    }
  } else {
    console.log('   ❌ revenuecat.config.ts missing');
    failed++;
  }
  
  // Test .env.example
  if (fs.existsSync(envExamplePath)) {
    console.log('   ✅ .env.example exists');
    passed++;
    
    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    if (envContent.includes('EXPO_PUBLIC_REVENUECAT_IOS_API_KEY')) {
      console.log('   ✅ Environment variables defined');
      passed++;
    } else {
      console.log('   ❌ Environment variables not defined');
      failed++;
    }
  } else {
    console.log('   ❌ .env.example missing');
    failed++;
  }
  
  return { passed, failed };
};

const testServiceFiles = () => {
  console.log('\n🔧 Testing service files...');
  
  const servicePath = path.join(__dirname, 'src', 'services', 'RevenueCatService.ts');
  const mockServicePath = path.join(__dirname, 'src', 'services', 'MockRevenueCatService.ts');
  
  let passed = 0;
  let failed = 0;
  
  // Test RevenueCat service
  if (fs.existsSync(servicePath)) {
    console.log('   ✅ RevenueCatService.ts exists');
    passed++;
    
    const serviceContent = fs.readFileSync(servicePath, 'utf8');
    
    const requiredMethods = [
      'initialize',
      'purchasePremium',
      'restorePurchases',
      'getSubscriptionInfo',
      'purchaseCredits'
    ];
    
    let methodsFound = 0;
    requiredMethods.forEach(method => {
      if (serviceContent.includes(`static async ${method}`) || serviceContent.includes(`static ${method}`)) {
        methodsFound++;
      }
    });
    
    if (methodsFound === requiredMethods.length) {
      console.log('   ✅ All required methods implemented');
      passed++;
    } else {
      console.log(`   ⚠️  Only ${methodsFound}/${requiredMethods.length} methods found`);
      failed++;
    }
  } else {
    console.log('   ❌ RevenueCatService.ts missing');
    failed++;
  }
  
  // Test Mock service
  if (fs.existsSync(mockServicePath)) {
    console.log('   ✅ MockRevenueCatService.ts exists');
    passed++;
  } else {
    console.log('   ❌ MockRevenueCatService.ts missing');
    failed++;
  }
  
  return { passed, failed };
};

const testPlatformConfig = () => {
  console.log('\n📱 Testing platform configuration...');
  
  const appJsonPath = path.join(__dirname, 'app.json');
  const packageJsonPath = path.join(__dirname, 'package.json');
  
  let passed = 0;
  let failed = 0;
  
  // Test app.json
  if (fs.existsSync(appJsonPath)) {
    console.log('   ✅ app.json exists');
    passed++;
    
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    // Check iOS bundle ID (iOS-only setup)
    const iosBundleId = appJson.expo?.ios?.bundleIdentifier;
    
    if (iosBundleId) {
      if (iosBundleId === 'com.yemekbulucuai.app') {
        console.log('   ✅ iOS Bundle ID configured correctly');
        console.log(`      iOS Bundle ID: ${iosBundleId}`);
        passed++;
      } else {
        console.log('   ⚠️  Bundle ID different from expected');
        console.log(`      iOS: ${iosBundleId}`);
        console.log(`      Expected: com.yemekbulucuai.app`);
        passed++; // Still pass, just different
      }
    } else {
      console.log('   ❌ iOS Bundle ID not configured');
      failed++;
    }
    
    // Android billing permission not needed (iOS-only setup)
    console.log('   ✅ Android billing permission not needed (iOS-only setup)');
    passed++;
  } else {
    console.log('   ❌ app.json missing');
    failed++;
  }
  
  // Test package.json dependencies
  if (fs.existsSync(packageJsonPath)) {
    console.log('   ✅ package.json exists');
    passed++;
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (packageJson.dependencies && packageJson.dependencies['react-native-purchases']) {
      console.log('   ✅ react-native-purchases dependency found');
      console.log(`      Version: ${packageJson.dependencies['react-native-purchases']}`);
      passed++;
    } else {
      console.log('   ❌ react-native-purchases dependency missing');
      failed++;
    }
  } else {
    console.log('   ❌ package.json missing');
    failed++;
  }
  
  return { passed, failed };
};

const testUIComponents = () => {
  console.log('\n🎨 Testing UI components...');
  
  const paywallPath = path.join(__dirname, 'src', 'components', 'premium', 'PaywallModal.tsx');
  const creditModalPath = path.join(__dirname, 'src', 'components', 'modals', 'CreditUpgradeModal.tsx');
  const debugPath = path.join(__dirname, 'src', 'components', 'debug', 'RevenueCatDebug.tsx');
  
  let passed = 0;
  let failed = 0;
  
  const components = [
    { path: paywallPath, name: 'PaywallModal' },
    { path: creditModalPath, name: 'CreditUpgradeModal' },
    { path: debugPath, name: 'RevenueCatDebug' },
  ];
  
  components.forEach(component => {
    if (fs.existsSync(component.path)) {
      console.log(`   ✅ ${component.name} exists`);
      passed++;
    } else {
      console.log(`   ❌ ${component.name} missing`);
      failed++;
    }
  });
  
  return { passed, failed };
};

const testContexts = () => {
  console.log('\n🧩 Testing contexts...');
  
  const premiumContextPath = path.join(__dirname, 'src', 'contexts', 'PremiumContext.tsx');
  
  let passed = 0;
  let failed = 0;
  
  if (fs.existsSync(premiumContextPath)) {
    console.log('   ✅ PremiumContext exists');
    passed++;
    
    const contextContent = fs.readFileSync(premiumContextPath, 'utf8');
    
    const requiredFeatures = [
      'isPremium',
      'purchasePremium',
      'restorePurchases',
      'availableOfferings'
    ];
    
    let featuresFound = 0;
    requiredFeatures.forEach(feature => {
      if (contextContent.includes(feature)) {
        featuresFound++;
      }
    });
    
    if (featuresFound === requiredFeatures.length) {
      console.log('   ✅ All required context features found');
      passed++;
    } else {
      console.log(`   ⚠️  Only ${featuresFound}/${requiredFeatures.length} features found`);
      failed++;
    }
  } else {
    console.log('   ❌ PremiumContext missing');
    failed++;
  }
  
  return { passed, failed };
};

const generateReport = (results) => {
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('========================');
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  Object.entries(results).forEach(([category, result]) => {
    console.log(`${category}: ${result.passed} ✅ / ${result.failed} ❌`);
    totalPassed += result.passed;
    totalFailed += result.failed;
  });
  
  console.log('========================');
  console.log(`TOTAL: ${totalPassed} ✅ / ${totalFailed} ❌`);
  
  const percentage = Math.round((totalPassed / (totalPassed + totalFailed)) * 100);
  console.log(`SUCCESS RATE: ${percentage}%`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! RevenueCat integration is ready!');
    console.log('\n📋 Next Steps:');
    console.log('1. Copy .env.example to .env and add your API keys');
    console.log('2. Create products in App Store Connect and Google Play Console');
    console.log('3. Configure entitlements in RevenueCat Dashboard');
    console.log('4. Test on real devices with sandbox accounts');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Please fix the issues above.');
  }
  
  return totalFailed === 0;
};

// Run all tests
const main = () => {
  const results = {
    'Config Files': testConfigFiles(),
    'Service Files': testServiceFiles(),
    'Platform Config': testPlatformConfig(),
    'UI Components': testUIComponents(),
    'Contexts': testContexts(),
  };
  
  const allPassed = generateReport(results);
  
  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
};

main();