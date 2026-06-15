import { test } from '@playwright/test';
import fs from 'fs';

test('debug docx pagination', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1000);
  
  const docxBytes = fs.readFileSync('tests/fixtures/test.docx');
  const uint8Array = new Uint8Array(docxBytes);
  
  await page.evaluate(async (bytes) => {
    try {
      const { convertWordToPDF } = await import('/src/utils/conversion.ts');
      
      // We will monkey-patch document.createElement to intercept the container!
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = function(tagName) {
        const el = originalCreateElement(tagName);
        if (tagName === 'div') {
          el.setAttribute('data-intercepted', 'true');
        }
        return el;
      };
      
      convertWordToPDF(new Uint8Array(bytes)).catch(() => {});
      
      // Wait for docx-preview to render
      await new Promise(r => setTimeout(r, 2000));
      
      // Find our container
      const container = document.querySelector('div[data-intercepted="true"]');
      if (container) {
         console.log('CONTAINER CHILDREN:', container.childNodes.length);
         for(let i = 0; i < container.childNodes.length; i++) {
           const child = container.childNodes[i];
           console.log(`Child ${i}: ${child.tagName} className: ${child.className}`);
           if (child.tagName === 'SECTION' || child.tagName === 'ARTICLE') {
               console.log(`  Section children: ${child.childNodes.length}`);
           }
         }
      }
    } catch(err) {
      console.log('ERROR:', err);
    }
  }, Array.from(uint8Array));
});
