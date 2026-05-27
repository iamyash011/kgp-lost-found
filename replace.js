const fs = require('fs');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Filter tabs - remove MY_REPORTS
  if (filePath.includes('Feed.jsx')) {
    content = content.replace("['ALL', 'LOST', 'FOUND', ...(user ? ['MY_REPORTS'] : [])]", "['ALL', 'LOST', 'FOUND']");
    content = content.replace("activeFilter === 'MY_REPORTS'", "false /* activeFilter removed */");
  }

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

  // Fix badges (Lost/Found pills)
  content = content.replace(/bg-red-500\/20 text-slate-700 dark:text-slate-300 border-red-500\/30/g, 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300');
  content = content.replace(/bg-emerald-500\/20 text-slate-700 dark:text-slate-300 border-emerald-500\/30/g, 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300');
  
  // Actually, the badges in original file used text-red-300 directly, not text-slate-300. Let's fix that directly with string replacement.
  content = content.replace("bg-red-500/20 text-red-300 border-red-500/30", "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 border-none shadow-sm");
  content = content.replace("bg-emerald-500/20 text-emerald-300 border-emerald-500/30", "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-none shadow-sm");


  // Fix buttons that became text-slate-900 dark:text-white but should stay white in solid buttons
  content = content.replace(/bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white/g, 'bg-blue-600 hover:bg-blue-700 text-white shadow-md');
  content = content.replace(/bg-green-600 hover:bg-green-500 text-slate-900 dark:text-white/g, 'bg-green-600 hover:bg-green-700 text-white shadow-md');
  content = content.replace(/bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white/g, 'bg-emerald-600 hover:bg-emerald-700 text-white');
  
  // Fix headings to use Outfit
  content = content.replace('text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight', 'text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-heading');

  fs.writeFileSync(filePath, content);
}

processFile('client/src/pages/Feed.jsx');
processFile('client/src/pages/ReportItem.jsx');

console.log("Theme replace done.");
