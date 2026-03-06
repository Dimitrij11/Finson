const fs = require('fs');

const extractAndReplace = () => {
  const dirFiles = [
    'src/features/crypto/CryptoPage.tsx',
    'src/components/layout/Sidebar.tsx',
    'src/components/layout/TopBar.tsx',
    'src/features/dashboard/DashboardPage.tsx',
    'src/features/transactions/TransactionsPage.tsx',
    'src/features/auth/LoginPage.tsx',
    'src/features/budgets/BudgetsPage.tsx',
    'src/features/about/AboutPage.tsx'
  ];

  const enJson = JSON.parse(fs.readFileSync('src/i18n/en.json', 'utf8'));
  const mkJson = JSON.parse(fs.readFileSync('src/i18n/mk.json', 'utf8'));
  
  let newKeysCount = 0;

  dirFiles.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    
    // Regex for: language === "mk" ? "mk text" : "en text"
    // Also handling inverted: language === "en" ? "en text" : "mk text"
    
    const mkFirstPattern = /language\s*===\s*["']mk["']\s*\?\s*["']([^"']+)["']\s*:\s*["']([^"']+)["']/g;
    content = content.replace(mkFirstPattern, (match, mkText, enText) => {
      const key = enText.replace(/[^a-zA-Z0-9]/g, '').slice(0, 30);
      const randomKey = key.charAt(0).toLowerCase() + key.slice(1) + Math.floor(Math.random()*1000);
      enJson[randomKey] = enText;
      mkJson[randomKey] = mkText;
      return 	("");
    });

    const enFirstPattern = /language\s*===\s*["']en["']\s*\?\s*["']([^"']+)["']\s*:\s*["']([^"']+)["']/g;
    content = content.replace(enFirstPattern, (match, enText, mkText) => {
      const key = enText.replace(/[^a-zA-Z0-9]/g, '').slice(0, 30);
      const randomKey = key.charAt(0).toLowerCase() + key.slice(1) + Math.floor(Math.random()*1000);
      enJson[randomKey] = enText;
      mkJson[randomKey] = mkText;
      return 	("");
    });

    fs.writeFileSync(f, content);
  });

  fs.writeFileSync('src/i18n/en.json', JSON.stringify(enJson, null, 2));
  fs.writeFileSync('src/i18n/mk.json', JSON.stringify(mkJson, null, 2));
  
  console.log("Extraction complete.");
};

extractAndReplace();
