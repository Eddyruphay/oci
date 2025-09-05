const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const targetUrl = 'https://www.xvideos.com/';
const outputDir = './.gemini/recon_data_xvideos';

async function runXvideosRecon() {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // Set User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');

    // Intercept network requests
    const networkRequests = [];
    page.on('request', request => {
        networkRequests.push({
            url: request.url(),
            method: request.method(),
            resourceType: request.resourceType(),
        });
    });
    page.on('response', async response => {
        const request = response.request();
        const matchingRequest = networkRequests.find(req => req.url === request.url() && req.method === request.method());
        if (matchingRequest) {
            try {
                matchingRequest.status = response.status();
                // Try to get response body for XHR/Fetch requests
                if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
                    matchingRequest.responseBody = await response.text();
                }
            } catch (e) {
                matchingRequest.responseBody = `(Could not read response body: ${e.message})`;
            }
        }
    });

    try {
        // Clear cookies before navigation
        const client = await page.target().createCDPSession();
        await client.send('Network.clearBrowserCookies');
        console.log('Browser cookies cleared.');

        console.log(`Navigating to ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 60000 });

        // Check final URL
        const finalUrl = page.url();
        if (!finalUrl.startsWith('https://www.xvideos.com/')) {
            console.error(`Redirected to unexpected URL: ${finalUrl}. Aborting reconnaissance.`);
            fs.writeFileSync(path.join(outputDir, 'xvideos_error.log'), `Redirected to unexpected URL: ${finalUrl}`);
            return;
        }

        // Attempt to bypass age disclaimer
        console.log('Attempting to bypass age disclaimer...');
        const enterButton = await page.$('#disclaimer_message .btn-primary');
        if (enterButton) {
            await enterButton.click();
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => console.log('Navigation after disclaimer click timed out or did not occur.'));
            console.log('Age disclaimer bypassed.');
        } else {
            console.log('No age disclaimer found or already bypassed.');
        }

        // Capture rendered HTML of main page
        const mainPageHtmlContent = await page.content();
        fs.writeFileSync(path.join(outputDir, 'xvideos_main_page.html'), mainPageHtmlContent);
        console.log('Main page HTML saved.');

        // Capture cookies
        const cookies = await page.cookies();
        fs.writeFileSync(path.join(outputDir, 'xvideos_cookies.json'), JSON.stringify(cookies, null, 2));
        console.log('Cookies saved.');

        // Capture JavaScript variables (e.g., looking for a global variable like window.XVC_DATA)
        const jsVariables = await page.evaluate(() => {
            const data = {};
            // Look for common global variables on xvideos.com
            if (window.XVC_DATA) {
                data.XVC_DATA = window.XVC_DATA;
            }
            if (window.player_data) {
                data.player_data = window.player_data;
            }
            return data;
        });
        fs.writeFileSync(path.join(outputDir, 'xvideos_js_variables.json'), JSON.stringify(jsVariables, null, 2));
        console.log('JavaScript variables saved.');

        // Save network requests
        fs.writeFileSync(path.join(outputDir, 'xvideos_network_requests.json'), JSON.stringify(networkRequests, null, 2));
        console.log('Network requests saved.');

        // Attempt to navigate to a sample video page if possible
        // This requires finding a video URL from the main page first
        // For simplicity, we'll try to find the first video link on the main page
        const firstVideoLink = await page.evaluate(() => {
            const linkElement = document.querySelector('a[href*="/video"]'); // Find any link containing /video
            return linkElement ? linkElement.href : null;
        });

        if (firstVideoLink) {
            console.log(`Navigating to sample video page: ${firstVideoLink}`);
            await page.goto(firstVideoLink, { waitUntil: 'networkidle0', timeout: 60000 });
            const videoPageHtmlContent = await page.content();
            fs.writeFileSync(path.join(outputDir, 'xvideos_sample_video_page.html'), videoPageHtmlContent);
            console.log('Sample video page HTML saved.');
        } else {
            console.log('No sample video link found on the main page.');
        }

    } catch (error) {
        console.error('Error during Xvideos reconnaissance:', error);
        fs.writeFileSync(path.join(outputDir, 'xvideos_error.log'), error.message + '\n' + error.stack);
    } finally {
        await browser.close();
    }
}

runXvideosRecon();