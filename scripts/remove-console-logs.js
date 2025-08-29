#!/usr/bin/env node

/**
 * Console.log Removal Script for Production Build
 * Replaces console.log statements with Logger service calls
 */

const fs = require('fs');
const path = require('path');

// Files to process (TypeScript and TSX files in src directory)
const srcDir = path.join(__dirname, '..', 'src');
const filesProcessed = [];
const replacements = [];

// Console replacement mappings
const replacementMap = {
  'console.log': 'Logger.info',
  'console.info': 'Logger.info',
  'console.warn': 'Logger.warn',
  'console.error': 'Logger.error',
  'console.debug': 'Logger.debug',
};

// Special cases that should be kept (for now)
const keepPatterns = [
  /console\.log.*DEV.*/, // Keep __DEV__ conditional logs temporarily
  /console\.error.*catch.*/, // Keep error logs in catch blocks temporarily
];

function shouldKeepConsoleLog(line) {
  return keepPatterns.some(pattern => pattern.test(line));
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let modified = false;
    const lines = content.split('\n');

    // Check if Logger is already imported
    const hasLoggerImport = /import.*Logger.*from.*LoggerService/.test(content);

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Skip if this console log should be kept
      if (shouldKeepConsoleLog(line)) {
        return;
      }

      // Find console statements
      Object.entries(replacementMap).forEach(
        ([consoleMethod, loggerMethod]) => {
          const consoleRegex = new RegExp(
            `\\b${consoleMethod.replace('.', '\\.')}\\s*\\(`,
            'g'
          );

          if (consoleRegex.test(line)) {
            const replacement = line.replace(consoleRegex, `${loggerMethod}(`);
            newContent = newContent.replace(line, replacement);
            modified = true;

            replacements.push({
              file: filePath,
              lineNumber: index + 1,
              original: trimmedLine,
              replacement: replacement.trim(),
            });
          }
        }
      );
    });

    // Add Logger import if needed and modifications were made
    if (modified && !hasLoggerImport) {
      // Find the last import statement that is not multiline
      let lastImportIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('import') && line.includes(';')) {
          lastImportIndex = i;
        }
        // Stop looking if we hit non-import content
        if (
          !line.startsWith('import') &&
          !line.startsWith('//') &&
          !line.startsWith('/*') &&
          line.length > 0 &&
          !line.startsWith('*') &&
          !line.endsWith('*/')
        ) {
          break;
        }
      }

      if (lastImportIndex >= 0) {
        // Calculate relative path depth
        const depth =
          filePath.split(path.sep).length - srcDir.split(path.sep).length - 1;
        const relativePath = '../'.repeat(depth) + 'services/LoggerService';
        const correctImport = `import { Logger } from '${relativePath}';`;

        lines.splice(lastImportIndex + 1, 0, correctImport);
        newContent = lines.join('\n');
      }
    }

    // Write back the modified content
    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      filesProcessed.push(filePath);
      console.log(`✅ Processed: ${path.relative(srcDir, filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDirectory(filePath);
    } else if (
      stat.isFile() &&
      (file.endsWith('.ts') || file.endsWith('.tsx'))
    ) {
      processFile(filePath);
    }
  });
}

// Main execution
console.log('🔧 Starting console.log removal for production build...\n');

// Check if LoggerService exists
const loggerServicePath = path.join(srcDir, 'services', 'LoggerService.ts');
if (!fs.existsSync(loggerServicePath)) {
  console.error(
    '❌ LoggerService.ts not found! Please ensure it exists before running this script.'
  );
  process.exit(1);
}

// Process all TypeScript files
walkDirectory(srcDir);

// Generate report
console.log('\n📊 Processing Summary:');
console.log(`Files processed: ${filesProcessed.length}`);
console.log(`Total replacements: ${replacements.length}`);

if (replacements.length > 0) {
  console.log('\n🔄 Replacements made:');
  replacements.forEach(replacement => {
    const relativePath = path.relative(srcDir, replacement.file);
    console.log(`  ${relativePath}:${replacement.lineNumber}`);
    console.log(`    - ${replacement.original}`);
    console.log(`    + ${replacement.replacement}`);
  });
}

// Generate manual review list for complex cases
const manualReviewNeeded = [];
filesProcessed.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const remainingConsoleLogs = content
    .split('\n')
    .filter(
      line =>
        /console\.(log|info|warn|error|debug)/.test(line) &&
        !shouldKeepConsoleLog(line)
    );

  if (remainingConsoleLogs.length > 0) {
    manualReviewNeeded.push({
      file,
      remainingLogs: remainingConsoleLogs.length,
    });
  }
});

if (manualReviewNeeded.length > 0) {
  console.log('\n⚠️  Manual Review Required:');
  manualReviewNeeded.forEach(item => {
    const relativePath = path.relative(srcDir, item.file);
    console.log(
      `  ${relativePath}: ${item.remainingLogs} console logs remaining`
    );
  });
}

console.log('\n✅ Console.log removal completed!');

if (filesProcessed.length === 0) {
  console.log('ℹ️  No files needed processing.');
} else {
  console.log('🎯 Next steps:');
  console.log('1. Review the changes and test the application');
  console.log('2. Remove any remaining console statements manually');
  console.log('3. Ensure Logger imports are working correctly');
  console.log('4. Test in development mode before production build');
}
