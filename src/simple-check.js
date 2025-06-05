const { chromium } = require('playwright');
require('dotenv').config();

async function simpleCheck() {
    console.log('🔍 Quick dashboard check...');
    
    const browser = await chromium.launch({ 
        headless: false,
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    
    try {
        // Try different login approaches
        try {
            await page.goto('https://app.geckoboard.com/', { waitUntil: 'networkidle' });
            console.log('✅ Navigated to main app page');
        } catch (e) {
            console.log('⚠️ Direct navigation failed, trying login page...');
            await page.goto('https://www.geckoboard.com/login');
            await page.fill('input[type="email"]', process.env.GECKOBOARD_EMAIL);
            await page.fill('input[type="password"]', process.env.GECKOBOARD_PASSWORD);
            await page.click('button[type="submit"]');
            await page.waitForTimeout(5000);
        }
        
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'simple-check.png', fullPage: true });
        
        // Try to find dashboard names
        try {
            const dashboardElements = await page.$$('span.name---_8bc6');
            console.log(`📊 Found ${dashboardElements.length} dashboard elements`);
            
            const dashboardNames = [];
            for (const element of dashboardElements) {
                try {
                    const text = await element.textContent();
                    if (text?.trim()) {
                        dashboardNames.push(text.trim());
                    }
                } catch (e) {
                    console.log('⚠️ Could not read dashboard name');
                }
            }
            
            console.log('\n📋 Current dashboards:');
            dashboardNames.forEach((name, index) => {
                const isTestDashboard = /^Dashboard \d+$/.test(name) || name.includes('Zendesk Test');
                const marker = isTestDashboard ? '🧪' : '📊';
                console.log(`  ${marker} ${index + 1}. ${name}`);
            });
            
            const testDashboards = dashboardNames.filter(name => 
                /^Dashboard \d+$/.test(name) || name.includes('Zendesk Test')
            );
            
            console.log(`\n🧪 Test dashboards remaining: ${testDashboards.length}`);
            if (testDashboards.length > 0) {
                testDashboards.forEach(name => console.log(`  - ${name}`));
            }
            
        } catch (error) {
            console.log(`❌ Could not read dashboards: ${error.message}`);
        }
        
        console.log('\n📸 Screenshot saved as simple-check.png');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: 'simple-check-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

simpleCheck(); 