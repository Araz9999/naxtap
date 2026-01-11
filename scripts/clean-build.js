const fs = require('fs');
const path = require('path');

const dirsToClean = process.argv.slice(2);

if (dirsToClean.length === 0) {
  console.log('Usage: node scripts/clean-build.js <dir1> <dir2> ...');
  console.log('Example: node scripts/clean-build.js backend/dist dist');
  process.exit(1);
}

function removeDir(dir) {
  const fullPath = path.resolve(dir);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`Directory does not exist: ${fullPath}`);
    return;
  }

  try {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`✓ Cleaned: ${fullPath}`);
  } catch (error) {
    console.error(`✗ Error cleaning ${fullPath}:`, error.message);
    process.exit(1);
  }
}

console.log('Cleaning build directories...\n');
dirsToClean.forEach(removeDir);
console.log('\n✓ Clean complete!');


