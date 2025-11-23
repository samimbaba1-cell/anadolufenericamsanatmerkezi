const fs = require('fs');
const path = require('path');

// Tüm page.js dosyalarını bul ve dynamic export ekle
function fixPages(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixPages(filePath);
    } else if (file === 'page.js') {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Eğer zaten dynamic export yoksa ekle
      if (!content.includes('export const dynamic = \'force-dynamic\';')) {
        // "use client" varsa ondan sonra ekle
        if (content.includes('"use client";')) {
          content = content.replace(
            '"use client";',
            '"use client";\n\n// Force dynamic rendering\nexport const dynamic = \'force-dynamic\';'
          );
        } else {
          // İlk import'tan önce ekle
          const firstImport = content.match(/import.*?from.*?;/);
          if (firstImport) {
            content = content.replace(
              firstImport[0],
              `// Force dynamic rendering\nexport const dynamic = 'force-dynamic';\n\n${firstImport[0]}`
            );
          }
        }
        
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed: ${filePath}`);
      } else {
        console.log(`⏭️  Already fixed: ${filePath}`);
      }
    }
  }
}

// src/app dizininden başla
const appDir = path.join(__dirname, 'src', 'app');
fixPages(appDir);

console.log('🎉 All pages fixed!');

