import fs from 'fs';

// Verificar se o arquivo tem tags JSX balanceadas
const content = fs.readFileSync('src/pages/WhatsappInboxPage.tsx', 'utf8');

const openTags = content.match(/<[^/][^>]*>/g) || [];
const closeTags = content.match(/<\/[^>]+>/g) || [];
const selfClosingTags = content.match(/<[^/][^>]*\/>/g) || [];

console.log('Open tags found:', openTags.length);
console.log('Close tags found:', closeTags.length);
console.log('Self-closing tags found:', selfClosingTags.length);

// Verificar fragments JSX
const fragmentsOpen = (content.match(/<>/g) || []).length;
const fragmentsClose = (content.match(/<\/>/g) || []).length;

console.log('JSX fragments open:', fragmentsOpen);
console.log('JSX fragments close:', fragmentsClose);

if (fragmentsOpen === fragmentsClose) {
  console.log('✅ Fragments balanceados');
} else {
  console.log('❌ Fragments desbalanceados');
}