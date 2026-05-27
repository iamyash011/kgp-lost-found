const fs = require('fs');

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace colors for text
  content = content.replace(/text-white/g, 'text-slate-900 dark:text-white');
  content = content.replace(/text-slate-200/g, 'text-slate-800 dark:text-slate-200');
  content = content.replace(/text-slate-300/g, 'text-slate-700 dark:text-slate-300');
  content = content.replace(/text-slate-400/g, 'text-slate-500 dark:text-slate-400');
  content = content.replace(/text-slate-500/g, 'text-slate-600 dark:text-slate-400');

  // Replace backgrounds
  content = content.replace(/bg-slate-900/g, 'bg-white dark:bg-slate-900');
  content = content.replace(/bg-slate-800\/20/g, 'bg-white dark:bg-slate-800/40');
  content = content.replace(/bg-slate-800/g, 'bg-slate-50 dark:bg-slate-800');
  content = content.replace(/bg-slate-950/g, 'bg-slate-100 dark:bg-slate-950');

  // Replace borders
  content = content.replace(/border-slate-700\/50/g, 'border-slate-200 dark:border-slate-700/50');
  content = content.replace(/border-slate-700/g, 'border-slate-200 dark:border-slate-700');
  content = content.replace(/border-slate-800/g, 'border-slate-200 dark:border-slate-800');

  // Soften rounding
  content = content.replace(/rounded-2xl/g, 'rounded-3xl');

  // Fix buttons that became text-slate-900 dark:text-white but should stay white in solid buttons
  content = content.replace(/bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white/g, 'bg-blue-600 hover:bg-blue-700 text-white shadow-md');
  content = content.replace(/bg-green-600 hover:bg-green-500 text-slate-900 dark:text-white/g, 'bg-green-600 hover:bg-green-700 text-white shadow-md');
  content = content.replace(/bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white/g, 'bg-emerald-600 hover:bg-emerald-700 text-white');
  
  // Fix headings to use Outfit
  content = content.replace('text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight', 'text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-heading');
  content = content.replace('text-4xl font-extrabold text-transparent bg-clip-text', 'text-4xl font-extrabold text-transparent bg-clip-text font-heading');

  fs.writeFileSync(filePath, content);
}

processFile('client/src/pages/Login.jsx');
processFile('client/src/pages/AdminDashboard.jsx');

console.log("Theme replace done for Login and Admin.");
