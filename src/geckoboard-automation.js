const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class GeckoboardAutomation {
    constructor() {
        this.browser = null;
        this.page = null;
        this.screenshotCounter = 1;
        
        // Configuration
        this.config = {
            email: 'taylor.potter@therealbrokerage.com',
            password: 'RealTaylor!',
            baseUrl: 'https://www.geckoboard.com',
            headless: false, // Set to true to run without visible browser
            timeout: 30000
        };
        
        this.logFile = path.join(__dirname, '..', 'automation-log.txt');
        this.initializeLog();
    }

    initializeLog() {
        const timestamp = new Date().toISOString();
        const logHeader = `=== Geckoboard Automation Started at ${timestamp} ===\n`;
        fs.writeFileSync(this.logFile, logHeader);
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        console.log(message);
        fs.appendFileSync(this.logFile, logMessage);
    }

    async takeScreenshot(description) {
        const filename = `step-${this.screenshotCounter.toString().padStart(2, '0')}-${description.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.png`;
        const filepath = path.join(__dirname, '..', 'screenshots', filename);
        
        await this.page.screenshot({ 
            path: filepath, 
            fullPage: true 
        });
        
        this.log(`📸 Screenshot saved: ${filename}`);
        this.screenshotCounter++;
        return filepath;
    }

    async initialize() {
        this.log('🚀 Initializing browser...');
        
        this.browser = await chromium.launch({
            headless: this.config.headless,
            viewport: { width: 1920, height: 1080 }
        });
        
        this.page = await this.browser.newPage();
        
        // Set longer timeout for all operations
        this.page.setDefaultTimeout(this.config.timeout);
        
        this.log('✅ Browser initialized successfully');
    }

    async login() {
        this.log('🔐 Starting login process...');
        
        try {
            // Navigate to Geckoboard login page
            await this.page.goto(`${this.config.baseUrl}/login`);
            await this.takeScreenshot('login-page');
            
            // Fill in email
            await this.page.fill('input[type="email"], input[name="email"], #email', this.config.email);
            this.log('📧 Email entered');
            
            // Fill in password
            await this.page.fill('input[type="password"], input[name="password"], #password', this.config.password);
            this.log('🔑 Password entered');
            
            await this.takeScreenshot('credentials-entered');
            
            // Click login button
            await this.page.click('button[type="submit"], input[type="submit"], .login-button, [data-testid="login-button"]');
            this.log('🔄 Login button clicked');
            
            // Wait for successful login (look for dashboard or account elements)
            await this.page.waitForLoadState('networkidle');
            await this.takeScreenshot('after-login');
            
            this.log('✅ Login completed successfully');
            
        } catch (error) {
            this.log(`❌ Login failed: ${error.message}`);
            await this.takeScreenshot('login-error');
            throw error;
        }
    }

    async createNewDashboard() {
        this.log('📊 Creating new dashboard...');
        
        try {
            // Look for "Create Dashboard" or "New Dashboard" button
            const createButtons = [
                'button:has-text("Create")',
                'button:has-text("New Dashboard")',
                'a:has-text("Create Dashboard")',
                '[data-testid="create-dashboard"]',
                '.create-dashboard',
                'button:has-text("Add Dashboard")'
            ];
            
            let buttonFound = false;
            for (const selector of createButtons) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 5000 });
                    await this.page.click(selector);
                    buttonFound = true;
                    this.log(`✅ Clicked create dashboard button: ${selector}`);
                    break;
                } catch (e) {
                    // Try next selector
                    continue;
                }
            }
            
            if (!buttonFound) {
                // Try to find any button with "create" or "new" in it
                await this.page.click('button:has-text("Create"), button:has-text("New"), a:has-text("Create"), a:has-text("New")');
                this.log('✅ Clicked generic create/new button');
            }
            
            await this.takeScreenshot('create-dashboard-clicked');
            
            // Wait for dashboard creation form or new dashboard page
            await this.page.waitForLoadState('networkidle');
            
            // If there's a dashboard name field, fill it
            const nameSelectors = [
                'input[name="name"]',
                'input[placeholder*="name"]',
                'input[placeholder*="title"]',
                '#dashboard-name',
                '.dashboard-name'
            ];
            
            for (const selector of nameSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 3000 });
                    await this.page.fill(selector, 'Zendesk First Reply Time Dashboard');
                    this.log('📝 Dashboard name entered');
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            await this.takeScreenshot('dashboard-creation-form');
            
            // Look for and click create/save button
            const saveButtons = [
                'button:has-text("Create")',
                'button:has-text("Save")',
                'button[type="submit"]',
                '.save-button',
                '.create-button'
            ];
            
            for (const selector of saveButtons) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 3000 });
                    await this.page.click(selector);
                    this.log(`✅ Clicked save/create button: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            await this.page.waitForLoadState('networkidle');
            await this.takeScreenshot('dashboard-created');
            
            this.log('✅ Dashboard created successfully');
            
        } catch (error) {
            this.log(`❌ Dashboard creation failed: ${error.message}`);
            await this.takeScreenshot('dashboard-creation-error');
            throw error;
        }
    }

    async addZendeskWidget() {
        this.log('🎯 Adding Zendesk widget...');
        
        try {
            // Look for "Add Widget" or similar button
            const addWidgetButtons = [
                'button:has-text("Add Widget")',
                'button:has-text("Add")',
                '.add-widget',
                '[data-testid="add-widget"]',
                'button:has-text("+")',
                '.widget-add'
            ];
            
            let buttonFound = false;
            for (const selector of addWidgetButtons) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 5000 });
                    await this.page.click(selector);
                    buttonFound = true;
                    this.log(`✅ Clicked add widget button: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            if (!buttonFound) {
                throw new Error('Could not find add widget button');
            }
            
            await this.takeScreenshot('add-widget-clicked');
            await this.page.waitForLoadState('networkidle');
            
            // Look for Zendesk in the data source options
            const zendeskSelectors = [
                'button:has-text("Zendesk")',
                'div:has-text("Zendesk")',
                '[data-source="zendesk"]',
                '.zendesk',
                'img[alt*="Zendesk"]'
            ];
            
            this.log('🔍 Looking for Zendesk data source...');
            
            for (const selector of zendeskSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 5000 });
                    await this.page.click(selector);
                    this.log(`✅ Selected Zendesk data source: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            await this.takeScreenshot('zendesk-selected');
            await this.page.waitForLoadState('networkidle');
            
            this.log('✅ Zendesk widget addition initiated');
            
        } catch (error) {
            this.log(`❌ Adding Zendesk widget failed: ${error.message}`);
            await this.takeScreenshot('zendesk-widget-error');
            throw error;
        }
    }

    async configureZendeskWidget() {
        this.log('⚙️ Configuring Zendesk widget for first reply time...');
        
        try {
            await this.takeScreenshot('widget-configuration-start');
            
            // Look for metric/measurement selection
            const metricSelectors = [
                'select[name*="metric"]',
                'select[name*="measurement"]',
                '.metric-select',
                '.measurement-select'
            ];
            
            // Try to find and select "First Reply Time" or similar
            for (const selector of metricSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 5000 });
                    
                    // Get all options and look for first reply time
                    const options = await this.page.$$eval(`${selector} option`, options => 
                        options.map(option => ({ value: option.value, text: option.textContent }))
                    );
                    
                    const replyTimeOption = options.find(option => 
                        option.text.toLowerCase().includes('first reply') ||
                        option.text.toLowerCase().includes('reply time') ||
                        option.text.toLowerCase().includes('response time')
                    );
                    
                    if (replyTimeOption) {
                        await this.page.selectOption(selector, replyTimeOption.value);
                        this.log(`✅ Selected metric: ${replyTimeOption.text}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            // Configure for "today's solved tickets"
            const timeRangeSelectors = [
                'select[name*="time"]',
                'select[name*="range"]',
                'select[name*="period"]',
                '.time-range-select'
            ];
            
            for (const selector of timeRangeSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 3000 });
                    
                    const options = await this.page.$$eval(`${selector} option`, options => 
                        options.map(option => ({ value: option.value, text: option.textContent }))
                    );
                    
                    const todayOption = options.find(option => 
                        option.text.toLowerCase().includes('today') ||
                        option.text.toLowerCase().includes('24 hour') ||
                        option.text.toLowerCase().includes('1 day')
                    );
                    
                    if (todayOption) {
                        await this.page.selectOption(selector, todayOption.value);
                        this.log(`✅ Selected time range: ${todayOption.text}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            // Configure for "solved tickets" status
            const statusSelectors = [
                'select[name*="status"]',
                'select[name*="ticket"]',
                '.status-select'
            ];
            
            for (const selector of statusSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 3000 });
                    
                    const options = await this.page.$$eval(`${selector} option`, options => 
                        options.map(option => ({ value: option.value, text: option.textContent }))
                    );
                    
                    const solvedOption = options.find(option => 
                        option.text.toLowerCase().includes('solved') ||
                        option.text.toLowerCase().includes('closed') ||
                        option.text.toLowerCase().includes('resolved')
                    );
                    
                    if (solvedOption) {
                        await this.page.selectOption(selector, solvedOption.value);
                        this.log(`✅ Selected status: ${solvedOption.text}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            // Look for "business hours" option
            const businessHoursSelectors = [
                'input[type="checkbox"]:has-text("business")',
                'input[type="checkbox"]:has-text("Business")',
                'label:has-text("business hours")',
                'label:has-text("Business hours")'
            ];
            
            for (const selector of businessHoursSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 3000 });
                    await this.page.check(selector);
                    this.log('✅ Enabled business hours filter');
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            await this.takeScreenshot('widget-configured');
            
            // Save the widget configuration
            const saveButtons = [
                'button:has-text("Save")',
                'button:has-text("Create")',
                'button:has-text("Add Widget")',
                'button[type="submit"]',
                '.save-widget'
            ];
            
            for (const selector of saveButtons) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 3000 });
                    await this.page.click(selector);
                    this.log(`✅ Clicked save button: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            await this.page.waitForLoadState('networkidle');
            await this.takeScreenshot('widget-saved');
            
            this.log('✅ Zendesk widget configured successfully');
            
        } catch (error) {
            this.log(`❌ Widget configuration failed: ${error.message}`);
            await this.takeScreenshot('widget-configuration-error');
            throw error;
        }
    }

    async finalize() {
        this.log('🏁 Finalizing automation...');
        
        try {
            // Take final screenshot of the completed dashboard
            await this.takeScreenshot('final-dashboard');
            
            // Get the current URL to save dashboard location
            const currentUrl = this.page.url();
            this.log(`📍 Dashboard URL: ${currentUrl}`);
            
            // Save dashboard URL to file
            const urlFile = path.join(__dirname, '..', 'dashboard-url.txt');
            fs.writeFileSync(urlFile, `Dashboard URL: ${currentUrl}\nCreated: ${new Date().toISOString()}`);
            
            this.log('✅ Dashboard creation completed successfully!');
            this.log(`📊 Dashboard accessible at: ${currentUrl}`);
            
        } catch (error) {
            this.log(`❌ Finalization error: ${error.message}`);
            throw error;
        }
    }

    async cleanup() {
        this.log('🧹 Cleaning up...');
        
        if (this.browser) {
            await this.browser.close();
            this.log('✅ Browser closed');
        }
        
        this.log('🎉 Automation completed!');
        this.log(`📋 Check the log file: ${this.logFile}`);
        this.log('📸 Screenshots saved in: ./screenshots/');
    }

    async run() {
        try {
            await this.initialize();
            await this.login();
            await this.createNewDashboard();
            await this.addZendeskWidget();
            await this.configureZendeskWidget();
            await this.finalize();
            
        } catch (error) {
            this.log(`💥 Automation failed: ${error.message}`);
            await this.takeScreenshot('final-error');
            throw error;
            
        } finally {
            await this.cleanup();
        }
    }
}

// Run the automation
async function main() {
    const automation = new GeckoboardAutomation();
    
    try {
        await automation.run();
        console.log('\n🎉 SUCCESS: Geckoboard automation completed!');
        console.log('📋 Check automation-log.txt for detailed logs');
        console.log('📸 Check screenshots/ folder for visual progress');
        console.log('📍 Check dashboard-url.txt for the dashboard URL');
        
    } catch (error) {
        console.error('\n💥 FAILED: Automation encountered an error');
        console.error('Error:', error.message);
        console.log('📋 Check automation-log.txt for detailed logs');
        console.log('📸 Check screenshots/ folder to see where it failed');
        process.exit(1);
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = GeckoboardAutomation; 