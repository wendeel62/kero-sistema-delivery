import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  try {
    const browser = await chromium.launch({ 
      headless: false,
      timeout: 30000
    });
    const page = await browser.newPage();
    
    console.log('Abrindo página http://localhost:5173...');
    try {
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
    } catch (e) {
      console.log('Timeout ao navegar, continuando mesmo assim...');
      await page.waitForTimeout(3000);
    }
    
    console.log('Aguardando 3 segundos para carregamento completo...');
    await page.waitForTimeout(3000);
    
    const screenshotPath = path.join(__dirname, 'pdv-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    console.log(`Screenshot salvo em: ${screenshotPath}`);
    console.log('Screenshot concluído com sucesso!');
    
    await browser.close();
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
})();
