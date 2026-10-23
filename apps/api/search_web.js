const fs = require('fs');
const path = require('path');

function searchDir(dir, query) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      searchDir(filePath, query);
    } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(file)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes(query)) {
        console.log(`Found "${query}" in: ${filePath}`);
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes(query)) {
            console.log(`  L${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

const targetDir = path.join(__dirname, '../web/src');
console.log('Searching for "useSearchParams" in', targetDir);
searchDir(targetDir, 'useSearchParams');
console.log('\nSearching for "token" in', targetDir);
searchDir(targetDir, 'token');
