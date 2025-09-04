import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const targetUrl = process.env.TARGET_URL || 'https://www.xnxx.com/';
const outputDir = './scraped_data'; // Changed to scraped_data

async function scrapeVideoIds() {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    try {
        console.log(`Navigating to ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 60000 });

        // Extract window.xv.conf
        const xvConf = await page.evaluate(() => {
            return window.xv && window.xv.conf ? window.xv.conf : null;
        });

        if (xvConf && xvConf.dyn && xvConf.dyn.categories) {
            const videoIds = [];
            xvConf.dyn.categories.forEach(category => {
                if (category.thumbs && Array.isArray(category.thumbs)) {
                    videoIds.push(...category.thumbs);
                }
            });

            // Remove duplicates
            const uniqueVideoIds = [...new Set(videoIds)];

            fs.writeFileSync(path.join(outputDir, 'video_ids.json'), JSON.stringify(uniqueVideoIds, null, 2));
            console.log(`Extracted ${uniqueVideoIds.length} unique video IDs.`);
        } else {
            console.log('Could not find xv.conf.dyn.categories. No video IDs extracted.');
            fs.writeFileSync(path.join(outputDir, 'video_ids.json'), JSON.stringify([], null, 2)); // Write empty array
        }

    } catch (error) {
        console.error('Error during video ID scraping:', error);
        fs.writeFileSync(path.join(outputDir, 'error.log'), error.message + '\n' + error.stack);
    } finally {
        await browser.close();
    }
}

scrapeVideoIds();