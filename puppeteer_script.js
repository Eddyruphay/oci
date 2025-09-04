const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio'); // Para parsing de HTML se necessário

const targetUrl = process.env.TARGET_URL || 'https://www.xnxx.com/';
const outputDir = './recon_data';

async function runRecon() {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // Intercept network requests
    const networkRequests = [];
    page.on('request', request => {
        networkRequests.push({
            url: request.url(),
            method: request.method(),
            headers: request.headers(),
            resourceType: request.resourceType(),
        });
    });
    page.on('response', async response => {
        const request = response.request();
        const matchingRequest = networkRequests.find(req => req.url === request.url() && req.method === request.method());
        if (matchingRequest) {
            try {
                matchingRequest.status = response.status();
                matchingRequest.headers = response.headers();
                // Try to get response body for XHR/Fetch requests
                if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
                    matchingRequest.responseBody = await response.text();
                }
            } catch (e) {
                // Handle cases where response body cannot be read (e.g., images, large files)
                matchingRequest.responseBody = `(Could not read response body: ${e.message})`;
            }
        }
    });

    try {
        console.log(`Navigating to ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 60000 });

        // Simulate user interaction: scroll down
        console.log('Scrolling down the page...');
        await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
        });
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for content to load after scroll

        // Capture rendered HTML
        const htmlContent = await page.content();
        fs.writeFileSync(path.join(outputDir, 'rendered_html.html'), htmlContent);
        console.log('Rendered HTML saved.');

        // Capture cookies
        const cookies = await page.cookies();
        fs.writeFileSync(path.join(outputDir, 'cookies.json'), JSON.stringify(cookies, null, 2));
        console.log('Cookies saved.');

        // Capture JavaScript variables (example: looking for a global variable)
        const jsVariables = await page.evaluate(() => {
            // Example: try to find a global variable that might contain video data
            // This part needs to be refined based on actual site analysis
            const data = {};
            if (window.someGlobalVideoData) {
                data.someGlobalVideoData = window.someGlobalVideoData;
            }
            // Add more specific variable checks here
            return data;
        });
        fs.writeFileSync(path.join(outputDir, 'js_variables.json'), JSON.stringify(jsVariables, null, 2));
        console.log('JavaScript variables saved.');

        // Save network requests
        fs.writeFileSync(path.join(outputDir, 'network_requests.json'), JSON.stringify(networkRequests, null, 2));
        console.log('Network requests saved.');

    } catch (error) {
        console.error('Error during Puppeteer reconnaissance:', error);
        fs.writeFileSync(path.join(outputDir, 'error.log'), error.message + '\n' + error.stack);
    } finally {
        await browser.close();
    }
}

runRecon();
