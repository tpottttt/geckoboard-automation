const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class FixedGeckoboardAutomation {
    constructor(version = '1.3') {
        this.browser = null;
        this.page = null;
        this.screenshotCounter = 1;
        this.version = version;
        this.dashboardName = `Zendesk Test v${version}`;
        
        this.config = {
            email: process.env.GECKOBOARD_EMAIL || '',
            password: process.env.GECKOBOARD_PASSWORD || '',
            baseUrl: process.env.GECKOBOARD_BASE_URL || 'https://www.geckoboard.com',
            headless: process.env.HEADLESS_MODE === 'true',
            timeout: parseInt(process.env.TIMEOUT_MS) || 30000
        };
        
        if (!this.config.email || !this.config.password) {
            throw new Error('Missing required environment variables: GECKOBOARD_EMAIL and GECKOBOARD_PASSWORD must be set');
        }
        
        this.logFile = path.join(__dirname, '..', `fixed-v${version}-log.txt`);
        this.initializeLog();
    }

    initializeLog() {
        const timestamp = new Date().toISOString();
        const logHeader = `=== Fixed Geckoboard Automation v${this.version} Started at ${timestamp} ===\n`;
        fs.writeFileSync(this.logFile, logHeader);
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        console.log(message);
        fs.appendFileSync(this.logFile, logMessage);
    }

    async takeScreenshot(description) {
        const filename = `fixed-${this.version}-${this.screenshotCounter.toString().padStart(2, '0')}-${description.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.png`;
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
        this.log(`🚀 Initializing fixed automation v${this.version}...`);
        this.log(`📊 Will create dashboard: "${this.dashboardName}"`);
        
        this.browser = await chromium.launch({
            headless: this.config.headless,
            viewport: { width: 1920, height: 1080 }
        });
        
        this.page = await this.browser.newPage();
        this.page.setDefaultTimeout(this.config.timeout);
        
        this.log('✅ Browser initialized successfully');
    }

    async login() {
        this.log('🔐 Starting login...');
        
        try {
            await this.page.goto(`${this.config.baseUrl}/login`);
            await this.takeScreenshot('login-page');
            
            await this.page.fill('input[type="email"]', this.config.email);
            this.log('📧 Email entered');
            
            await this.page.fill('input[type="password"]', this.config.password);
            this.log('🔑 Password entered');
            
            await this.takeScreenshot('credentials-entered');
            
            const loginButton = await this.page.waitForSelector('button[type="submit"]');
            await loginButton.click();
            this.log('🔄 Login button clicked');
            
            // Proper wait to prevent flickering
            await this.page.waitForLoadState('networkidle');
            await this.page.waitForTimeout(5000);
            
            await this.takeScreenshot('after-login');
            this.log('✅ Login completed');
            
        } catch (error) {
            this.log(`❌ Login failed: ${error.message}`);
            throw error;
        }
    }

    async cleanupTestDashboards() {
        this.log('🧹 Cleaning up test dashboards...');
        
        try {
            await this.page.goto('https://app.geckoboard.com/');
            await this.page.waitForTimeout(3000);
            await this.takeScreenshot('cleanup-start');
            
            // Get all dashboard names
            const dashboardNames = await this.page.$$eval('span.name---_8bc6', spans => 
                spans.map(span => span.textContent?.trim()).filter(text => text)
            );
            
            this.log(`📊 Found dashboards: ${dashboardNames.join(', ')}`);
            
            // Look for test dashboards (Dashboard XX or Zendesk Test)
            const testDashboards = dashboardNames.filter(name => 
                /^Dashboard \d+$/.test(name) || name.includes('Zendesk Test')
            );
            
            this.log(`🗑️ Test dashboards to delete: ${testDashboards.join(', ')}`);
            
            for (const dashboardName of testDashboards) {
                this.log(`🗑️ Deleting: ${dashboardName}`);
                
                try {
                    // Find the dashboard span
                    const dashboardSpan = await this.page.$(`span.name---_8bc6:has-text("${dashboardName}")`);
                    if (!dashboardSpan) {
                        this.log(`⚠️ Could not find dashboard: ${dashboardName}`);
                        continue;
                    }
                    
                    // Get the parent link
                    const dashboardLink = await dashboardSpan.evaluateHandle(span => span.closest('a'));
                    
                    // If this dashboard is active, we need to switch to another one first
                    const isActive = await dashboardLink.evaluate(link => link.classList.contains('active'));
                    
                    if (isActive) {
                        this.log(`⚠️ ${dashboardName} is active, switching to another dashboard first...`);
                        
                        // Find any non-test dashboard to switch to
                        const nonTestDashboards = dashboardNames.filter(name => 
                            !(/^Dashboard \d+$/.test(name)) && !name.includes('Zendesk Test')
                        );
                        
                        if (nonTestDashboards.length > 0) {
                            const targetDashboard = nonTestDashboards[0];
                            this.log(`🔄 Switching to: ${targetDashboard}`);
                            
                            const targetSpan = await this.page.$(`span.name---_8bc6:has-text("${targetDashboard}")`);
                            if (targetSpan) {
                                const targetLink = await targetSpan.evaluateHandle(span => span.closest('a'));
                                await targetLink.click();
                                await this.page.waitForTimeout(2000);
                                this.log(`✅ Switched to: ${targetDashboard}`);
                            }
                        }
                    }
                    
                    // Now delete the dashboard
                    await dashboardLink.hover();
                    await this.page.waitForTimeout(1500);
                    this.log(`🔍 Hovering over ${dashboardName}`);
                    
                    // Look for the menu button near this specific dashboard
                    const menuButton = await this.page.waitForSelector('button.openContextMenuButton---_8f4e', { timeout: 5000 });
                    await menuButton.click();
                    await this.page.waitForTimeout(1000);
                    this.log(`🎯 Opened menu for ${dashboardName}`);
                    
                    // Click Delete
                    const deleteButton = await this.page.waitForSelector('span.menuItemLabel---f5516:has-text("Delete")', { timeout: 3000 });
                    await deleteButton.click();
                    await this.page.waitForTimeout(1000);
                    
                    // Handle confirmation if it appears
                    try {
                        const confirmButton = await this.page.waitForSelector('button:has-text("Delete")', { timeout: 3000 });
                        await confirmButton.click();
                        this.log(`✅ Confirmed deletion of ${dashboardName}`);
                    } catch (e) {
                        this.log(`ℹ️ No confirmation needed for ${dashboardName}`);
                    }
                    
                    await this.page.waitForTimeout(2000);
                    this.log(`✅ Deleted: ${dashboardName}`);
                    
                } catch (error) {
                    this.log(`❌ Failed to delete ${dashboardName}: ${error.message}`);
                }
            }
            
            await this.takeScreenshot('cleanup-completed');
            this.log('✅ Cleanup completed');
            
        } catch (error) {
            this.log(`❌ Cleanup failed: ${error.message}`);
            // Continue anyway
        }
    }

    async createNewDashboard() {
        this.log('📊 Creating new dashboard...');
        
        try {
            await this.page.goto('https://app.geckoboard.com/');
            await this.page.waitForTimeout(2000);
            
            const newDashboardButton = await this.page.waitForSelector('button:has-text("New dashboard")');
            await newDashboardButton.click();
            this.log('✅ Clicked "New dashboard" button');
            
            await this.page.waitForLoadState('networkidle');
            await this.page.waitForTimeout(3000);
            await this.takeScreenshot('dashboard-created');
            
            this.log('✅ New dashboard created successfully');
            
        } catch (error) {
            this.log(`❌ Dashboard creation failed: ${error.message}`);
            throw error;
        }
    }

    async renameDashboard() {
        this.log(`📝 Renaming dashboard to: ${this.dashboardName}`);
        
        try {
            await this.page.waitForTimeout(2000);
            
            // Navigate back to main dashboard list to see sidebar
            await this.page.goto('https://app.geckoboard.com/');
            await this.page.waitForTimeout(3000);
            await this.takeScreenshot('before-rename-navigation');
            
            // Find the active dashboard in sidebar
            const activeDashboard = await this.page.$('a.sidebarListLink---e8cba.active');
            
            if (activeDashboard) {
                this.log('✅ Found active dashboard');
                
                const currentName = await activeDashboard.textContent();
                this.log(`📝 Current name: ${currentName?.trim()}`);
                
                // Hover over it
                await activeDashboard.hover();
                await this.page.waitForTimeout(2000);
                await this.takeScreenshot('hovering-for-rename');
                
                // Look for menu button that appears near the hovered element
                const menuButtons = await this.page.$$('button.openContextMenuButton---_8f4e');
                this.log(`🔍 Found ${menuButtons.length} menu buttons`);
                
                // Try clicking the visible one
                for (let i = 0; i < menuButtons.length; i++) {
                    const button = menuButtons[i];
                    const isVisible = await button.isVisible();
                    
                    if (isVisible) {
                        this.log(`🎯 Clicking menu button ${i + 1}`);
                        await button.click();
                        await this.page.waitForTimeout(1000);
                        
                        // Check if rename option appeared
                        const renameButton = await this.page.$('span.menuItemLabel---f5516:has-text("Rename")');
                        if (renameButton) {
                            this.log('✅ Found Rename option');
                            await renameButton.click();
                            await this.page.waitForTimeout(1500);
                            
                            await this.takeScreenshot('rename-mode-active');
                            
                            // The dashboard name should now be editable
                            // Try triple-click to select all text first
                            await activeDashboard.click({ clickCount: 3 });
                            await this.page.waitForTimeout(500);
                            
                            // Type the new name
                            await this.page.keyboard.type(this.dashboardName);
                            await this.page.waitForTimeout(500);
                            
                            // Press Enter to confirm
                            await this.page.keyboard.press('Enter');
                            await this.page.waitForTimeout(2000);
                            
                            await this.takeScreenshot('dashboard-renamed');
                            this.log(`✅ Dashboard renamed to: ${this.dashboardName}`);
                            return;
                        }
                    }
                }
                
                this.log('⚠️ Could not find or click rename option');
                
            } else {
                this.log('⚠️ No active dashboard found');
            }
            
        } catch (error) {
            this.log(`❌ Rename failed: ${error.message}`);
            await this.takeScreenshot('rename-error');
        }
    }

    async addZendeskWidget() {
        this.log('🎯 Adding Zendesk Support widget...');
        
        try {
            // Make sure we're on the dashboard edit page
            const currentUrl = this.page.url();
            if (!currentUrl.includes('/edit/dashboards/')) {
                // Click on the active dashboard to open it for editing
                const activeDashboard = await this.page.$('a.sidebarListLink---e8cba.active');
                if (activeDashboard) {
                    await activeDashboard.click();
                    await this.page.waitForTimeout(2000);
                }
            }
            
            const addWidgetButton = await this.page.waitForSelector('button:has-text("Add Widget"), button:has-text("Add widget")');
            await addWidgetButton.click();
            this.log('✅ Clicked "Add Widget" button');
            
            await this.page.waitForTimeout(3000);
            await this.takeScreenshot('widget-selection-opened');
            
            // Look for Zendesk Support
            const zendeskSupport = await this.page.waitForSelector('div:has-text("Zendesk Support"), button:has-text("Zendesk Support")');
            await zendeskSupport.click();
            this.log('✅ Selected Zendesk Support');
            
            await this.page.waitForTimeout(3000);
            await this.takeScreenshot('zendesk-support-selected');
            
            this.log('✅ Zendesk Support widget added successfully');
            
        } catch (error) {
            this.log(`❌ Adding Zendesk widget failed: ${error.message}`);
            throw error;
        }
    }

    async finalize() {
        this.log('🏁 Finalizing...');
        
        try {
            await this.takeScreenshot('final-state');
            
            const currentUrl = this.page.url();
            this.log(`📍 Dashboard URL: ${currentUrl}`);
            
            const urlFile = path.join(__dirname, '..', `fixed-v${this.version}-url.txt`);
            fs.writeFileSync(urlFile, `Dashboard: ${this.dashboardName}\nURL: ${currentUrl}\nCreated: ${new Date().toISOString()}`);
            
            this.log(`✅ Fixed automation v${this.version} completed successfully!`);
            
        } catch (error) {
            this.log(`❌ Finalization error: ${error.message}`);
        }
    }

    async cleanup() {
        this.log('🧹 Cleaning up browser...');
        
        if (this.browser) {
            await this.browser.close();
            this.log('✅ Browser closed');
        }
        
        this.log('🎉 Fixed automation finished!');
        this.log(`📋 Check log: fixed-v${this.version}-log.txt`);
        this.log('📸 Screenshots saved in: ./screenshots/');
    }

    async run() {
        try {
            await this.initialize();
            await this.login();
            await this.cleanupTestDashboards();
            await this.createNewDashboard();
            await this.renameDashboard();
            await this.addZendeskWidget();
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
    const version = process.argv[2] || '1.3';
    const automation = new FixedGeckoboardAutomation(version);
    
    try {
        await automation.run();
        console.log(`\n🎉 SUCCESS: Fixed Geckoboard automation v${version} completed!`);
        console.log(`📊 Created dashboard: "Zendesk Test v${version}"`);
        console.log(`📋 Check fixed-v${version}-log.txt for detailed logs`);
        console.log('📸 Check screenshots/ folder for visual progress');
        console.log(`📍 Check fixed-v${version}-url.txt for the dashboard URL`);
        
    } catch (error) {
        console.error(`\n💥 FAILED: Fixed automation v${version} encountered an error`);
        console.error('Error:', error.message);
        console.log(`📋 Check fixed-v${version}-log.txt for detailed logs`);
        console.log('📸 Check screenshots/ folder to see where it failed');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = FixedGeckoboardAutomation; 