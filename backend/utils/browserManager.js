const fs = require('fs');
const puppeteer = require('puppeteer');

let browserInstance = null;

async function getBrowser() {
  if (browserInstance) {
    return browserInstance;
  }
  
  try {
    const launchOptions = {
      headless: 'shell',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };

    // Check for standard Chrome executables to avoid launch issues on Windows
    const standardPaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser'
    ];

    for (const p of standardPaths) {
      if (fs.existsSync(p)) {
        launchOptions.executablePath = p;
        break;
      }
    }

    browserInstance = await puppeteer.launch(launchOptions);

    // Handle browser disconnection
    browserInstance.on('disconnected', () => {
      console.log('Puppeteer browser disconnected. Re-launching...');
      browserInstance = null;
    });

    return browserInstance;
  } catch (err) {
    console.error("Failed to launch Puppeteer:", err);
    throw err;
  }
}

module.exports = { getBrowser };
