#!/usr/bin/env node

/**
 * Simple validation script to check if the backend setup is correct
 * This can be run without installing dependencies to validate the structure
 */

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'src/index.ts',
  'src/config/index.ts',
  'src/utils/logger.ts',
  'src/middleware/auth.ts',
  'src/middleware/errorHandler.ts',
  'src/middleware/validation.ts',
  'src/routes/auth.ts',
  'src/routes/upload.ts',
  'src/__tests__/auth.test.ts',
  'src/__tests__/setup.test.ts',
  'package.json',
  'tsconfig.json',
  'jest.config.js',
  '.env.example',
  'README.md'
];

const requiredDependencies = [
  'express',
  'cors',
  'helmet',
  'jsonwebtoken',
  'express-validator',
  'redis',
  'multer',
  'winston',
  'dotenv'
];

const requiredDevDependencies = [
  'typescript',
  'ts-node-dev',
  'jest',
  '@types/jest',
  'ts-jest',
  'supertest',
  '@types/supertest'
];

console.log('🔍 Validating backend API setup...\n');

// Check required files
console.log('📁 Checking required files:');
let missingFiles = [];
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    missingFiles.push(file);
  }
});

// Check package.json dependencies
console.log('\n📦 Checking dependencies:');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  
  let missingDeps = [];
  requiredDependencies.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`  ✅ ${dep}`);
    } else {
      console.log(`  ❌ ${dep} - MISSING`);
      missingDeps.push(dep);
    }
  });

  let missingDevDeps = [];
  requiredDevDependencies.forEach(dep => {
    if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
      console.log(`  ✅ ${dep} (dev)`);
    } else {
      console.log(`  ❌ ${dep} (dev) - MISSING`);
      missingDevDeps.push(dep);
    }
  });

  // Summary
  console.log('\n📊 Validation Summary:');
  if (missingFiles.length === 0 && missingDeps.length === 0 && missingDevDeps.length === 0) {
    console.log('  🎉 All checks passed! Backend API setup is complete.');
    console.log('\n🚀 Next steps:');
    console.log('  1. Run: npm install');
    console.log('  2. Copy: cp .env.example .env');
    console.log('  3. Update .env with your configuration');
    console.log('  4. Run: npm run dev');
    console.log('  5. Run tests: npm test');
  } else {
    console.log('  ⚠️  Some issues found:');
    if (missingFiles.length > 0) {
      console.log(`    - ${missingFiles.length} missing files`);
    }
    if (missingDeps.length > 0) {
      console.log(`    - ${missingDeps.length} missing dependencies`);
    }
    if (missingDevDeps.length > 0) {
      console.log(`    - ${missingDevDeps.length} missing dev dependencies`);
    }
  }

} catch (error) {
  console.log('  ❌ Error reading package.json:', error.message);
}

console.log('\n✨ Validation complete!');