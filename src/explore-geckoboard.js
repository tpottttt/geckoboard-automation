const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class GeckoboardExplorer {
    constructor() {
        this.browser = null;
        this.page = null;
        this.config = {
            email: process.env.GECKOBOARD_EMAIL || '',
            password: process.env.GECKOBOARD_PASSWORD || '',
            baseUrl: process.env.GECKOBOARD_BASE_URL || 'https://www.geckoboard.com',
            headless: process.env.HEADLESS_MODE === 'true',
            timeout: parseInt(process.env.TIMEOUT_MS) || 30000
        };
        
        // Validate required credentials
        if (!this.config.email || !this.config.password) {
            throw new Error('Missing required environment variables: GECKOBOARD_EMAIL and GECKOBOARD_PASSWORD must be set');
        }
    }

    async initialize() {
        console.log('🔍 Starting Geckoboard exploration...');
        
        this.browser = await chromium.launch({
            headless: this.config.headless,
            viewport: { width: 1920, height: 1080 }
        });
        
        this.page = await this.browser.newPage();
        this.page.setDefaultTimeout(this.config.timeout);
    }

    async login() {
        console.log('🔐 Logging into Geckoboard...');
        
        await this.page.goto(`${this.config.baseUrl}/login`);
        await this.page.screenshot({ path: 'screenshots/explore-01-login-page.png', fullPage: true });
        
        // Let's see what login elements are actually available
        console.log('\n📋 LOGIN PAGE ANALYSIS:');
        
        // Find all input fields
        const inputs = await this.page.$$eval('input', inputs => 
            inputs.map(input => ({
                type: input.type,
                name: input.name,
                id: input.id,
                placeholder: input.placeholder,
                className: input.className
            }))
        );
        console.log('Input fields found:', JSON.stringify(inputs, null, 2));
        
        // Find all buttons
        const buttons = await this.page.$$eval('button, input[type="submit"]', buttons => 
            buttons.map(button => ({
                text: button.textContent?.trim(),
                type: button.type,
                className: button.className,
                id: button.id
            }))
        );
        console.log('Buttons found:', JSON.stringify(buttons, null, 2));
        
        // Try to login with the most likely selectors
        try {
            await this.page.fill('input[type="email"], input[name="email"], #email', this.config.email);
            await this.page.fill('input[type="password"], input[name="password"], #password', this.config.password);
            await this.page.screenshot({ path: 'screenshots/explore-02-credentials-filled.png', fullPage: true });
            
            await this.page.click('button[type="submit"], input[type="submit"]');
            await this.page.waitForLoadState('networkidle');
            await this.page.screenshot({ path: 'screenshots/explore-03-after-login.png', fullPage: true });
            
            console.log('✅ Login successful!');
            return true;
        } catch (error) {
            console.log('❌ Login failed:', error.message);
            return false;
        }
    }

    async exploreDashboardCreation() {
        console.log('\n📊 DASHBOARD CREATION ANALYSIS:');
        
        // Look for any buttons or links related to creating dashboards
        const createElements = await this.page.$$eval('*', elements => 
            elements
                .filter(el => {
                    const text = el.textContent?.toLowerCase() || '';
                    return text.includes('create') || text.includes('new') || text.includes('dashboard') || text.includes('add');
                })
                .map(el => ({
                    tagName: el.tagName,
                    text: el.textContent?.trim(),
                    className: el.className,
                    id: el.id,
                    href: el.href
                }))
                .slice(0, 20) // Limit to first 20 matches
        );
        
        console.log('Create/New/Dashboard elements found:');
        createElements.forEach((el, i) => {
            console.log(`${i + 1}. ${el.tagName}: "${el.text}" (class: ${el.className})`);
        });
        
        await this.page.screenshot({ path: 'screenshots/explore-04-dashboard-page.png', fullPage: true });
    }

    async exploreWidgetOptions() {
        console.log('\n🎯 WIDGET OPTIONS ANALYSIS:');
        
        // Look for any elements related to widgets or data sources
        const widgetElements = await this.page.$$eval('*', elements => 
            elements
                .filter(el => {
                    const text = el.textContent?.toLowerCase() || '';
                    return text.includes('widget') || text.includes('zendesk') || text.includes('data') || text.includes('source');
                })
                .map(el => ({
                    tagName: el.tagName,
                    text: el.textContent?.trim(),
                    className: el.className,
                    id: el.id
                }))
                .slice(0, 15)
        );
        
        console.log('Widget/Zendesk/Data source elements found:');
        widgetElements.forEach((el, i) => {
            console.log(`${i + 1}. ${el.tagName}: "${el.text}" (class: ${el.className})`);
        });
    }

    async interactiveExploration() {
        console.log('\n🎮 INTERACTIVE EXPLORATION MODE');
        console.log('The browser will stay open for you to manually explore.');
        console.log('Navigate around and see what options are available.');
        console.log('Press Ctrl+C in the terminal when you want to end the exploration.');
        
        // Keep the browser open for manual exploration
        await new Promise(resolve => {
            process.on('SIGINT', () => {
                console.log('\n👋 Ending exploration...');
                resolve();
            });
            
            // Check every 5 seconds if user wants to continue
            const checkInterval = setInterval(() => {
                console.log('🔍 Still exploring... (Ctrl+C to exit)');
            }, 30000);
            
            process.on('SIGINT', () => {
                clearInterval(checkInterval);
                resolve();
            });
        });
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
        console.log('✅ Exploration completed!');
    }

    async run() {
        try {
            await this.initialize();
            
            const loginSuccess = await this.login();
            if (!loginSuccess) {
                console.log('❌ Cannot proceed without successful login');
                return;
            }
            
            await this.exploreDashboardCreation();
            await this.exploreWidgetOptions();
            await this.interactiveExploration();
            
        } catch (error) {
            console.error('💥 Exploration failed:', error.message);
        } finally {
            await this.cleanup();
        }
    }
}

// Run the exploration
async function main() {
    const explorer = new GeckoboardExplorer();
    await explorer.run();
}

if (require.main === module) {
    main();
}

module.exports = GeckoboardExplorer; 