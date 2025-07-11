const { chromium } = require('playwright');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

(async () => {
  // Launch browser and keep it open
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Keep the browser open with an empty tab
  await page.goto('about:blank');

  // Function to process a profile URL
  const processProfile = async (profileUrl) => {
    const profilePage = await context.newPage();
    
    try {
      console.log(`\nFetching data from: ${profileUrl}`);
      await profilePage.goto(profileUrl);
      await profilePage.waitForTimeout(2000); // Wait for page to load

      const result = await profilePage.evaluate(() => {
        // 1. Get CSSTATSGG Matches 
        const getCsstatsggMatches = () => {
          const button = document.querySelector('button[hx-get*="csstatsgg-matches"]');
          return button ? button.textContent.trim() : '0';
        };

        // 2. Get Current Playtime
        const getCurrentPlaytime = () => {
          try {
            const playtimeElements = document.querySelectorAll('p.text-xs + p.text-white span.tooltip[data-tip="Total"]');
            return playtimeElements.length >= 2 ? playtimeElements[1].textContent.trim() : 'Hidden';
          } catch (error) {
            return 'Hidden';
          }
        };

        // 3. Get Faceit Level
        const getFaceitLevelCS2 = () => {
          const faceitImgs = document.querySelectorAll('img[alt^="Faceit level"]');
          if (faceitImgs.length === 0) return "No -";
          if (faceitImgs.length >= 2) {
            const cs2Level = faceitImgs[1].getAttribute('alt').match(/\d+/)?.[0];
            return cs2Level ? `Yes ${cs2Level}` : "Yes -";
          }
          const csgoLevel = faceitImgs[0].getAttribute('alt').match(/\d+/)?.[0];
          return csgoLevel ? `Yes ${csgoLevel}` : "Yes -";
        };

        // 4. Get Premier Rating 
        const getHighestPremierRating = () => {
          const ratings = Array.from(document.querySelectorAll('.cs2rating'))
            .map(el => parseInt(el.textContent.replace(/\s+|,/g, ''))) || [0];
          return ratings.length > 0 ? Math.max(...ratings).toLocaleString() : '0';
        };

        // Get and format all values
        const matchCount = getCsstatsggMatches();
        const playtime = getCurrentPlaytime();
        const faceitData = getFaceitLevelCS2();
        const premierRating = getHighestPremierRating();

        const [yesNo, faceitLevel] = faceitData.includes('Yes') ? 
          ['Yes', faceitData.split(' ')[1] || '-'] : 
          ['No', '-'];

        return `${matchCount} ${playtime} ${yesNo} ${faceitLevel} ${premierRating}`;
      });

      console.log(`${profileUrl} ${result}`);
      
    } catch (error) {
      console.error(`Error processing ${profileUrl}:`, error.message);
    } finally {
      await profilePage.close();
    }
  };

// Main input loop
while (true) {
  const profileUrl = await new Promise(resolve => {
    readline.question('\nEnter profile URL (or "quit" to exit): ', resolve);
  });

  if (profileUrl.toLowerCase() === 'quit') break;
  
  // Transform csstats.gg URLs to csst.at format
  let processedUrl = profileUrl;
  if (profileUrl.includes('csstats.gg/player/')) {
    const steamId = profileUrl.split('/player/')[1];
    processedUrl = `https://csst.at/profile/${steamId}`;
  }
  
  if (!processedUrl.startsWith('http')) {
    console.log('Please enter a valid URL starting with http/https');
    continue;
  }

  await processProfile(processedUrl);
}

  // Cleanup
  readline.close();
  await browser.close();
})();
