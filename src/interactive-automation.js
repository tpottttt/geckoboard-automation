const { chromium } = require('playwright');
const readline = require('readline');
require('dotenv').config();

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askUser(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.toLowerCase().trim());
        });
    });
}

class InteractiveAutomation {
    constructor() {
        this.browser = null;
        this.page = null;
        this.screenshotCounter = 1;
        this.createdDashboards = []; // Track dashboards we create
        this.testDashboardPrefix = 'AUTO-TEST-'; // Unique prefix for our test dashboards
        this.sessionId = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    }

    generateTestDashboardName() {
        // Generate a unique name like "AUTO-TEST-123456-Widget-Test"
        return `${this.testDashboardPrefix}${this.sessionId}-Widget-Test`;
    }

    async takeScreenshot(description) {
        const filename = `interactive-${this.screenshotCounter.toString().padStart(2, '0')}-${description}.png`;
        await this.page.screenshot({ 
            path: `screenshots/${filename}`, 
            fullPage: true 
        });
        console.log(`📸 Screenshot: ${filename}`);
        this.screenshotCounter++;
    }

    async initialize() {
        console.log('🚀 Starting interactive automation...');
        console.log(`🏷️ Session ID: ${this.sessionId}`);
        console.log(`🎯 Will create dashboard: ${this.generateTestDashboardName()}`);
        
        this.browser = await chromium.launch({
            headless: false,  // Keep visible so you can see
            viewport: { width: 1920, height: 1080 }
        });
        
        this.page = await this.browser.newPage();
        this.page.setDefaultTimeout(30000);
        
        console.log('✅ Browser opened - you should see it now');
    }

    async step1_Login() {
        console.log('\n🔐 STEP 1: Login');
        console.log('Attempting to login...');
        
        await this.page.goto('https://www.geckoboard.com/login');
        await this.takeScreenshot('login-page');
        
        await this.page.fill('input[type="email"]', process.env.GECKOBOARD_EMAIL);
        await this.page.fill('input[type="password"]', process.env.GECKOBOARD_PASSWORD);
        await this.takeScreenshot('credentials-filled');
        
        await this.page.click('button[type="submit"]');
        console.log('🔄 Clicked login button');
        
        // Wait a bit for login to process
        await this.page.waitForTimeout(5000);
        await this.takeScreenshot('after-login-attempt');
        
        const response = await askUser('\n❓ Did the login work? Are you now on the main dashboard page? (yes/no): ');
        
        if (response === 'yes' || response === 'y') {
            console.log('✅ Login successful!');
            return true;
        } else {
            console.log('❌ Login failed');
            const feedback = await askUser('🔍 What do you see? Describe what happened: ');
            console.log(`📝 User feedback: ${feedback}`);
            return false;
        }
    }

    async step2_CleanupTestDashboards() {
        console.log('\n🧹 STEP 2: Clean up existing automation test dashboards FIRST');
        console.log(`🔍 Looking for dashboards starting with: ${this.testDashboardPrefix}`);
        
        // Navigate to main page
        await this.page.goto('https://app.geckoboard.com/');
        await this.page.waitForTimeout(3000);
        await this.takeScreenshot('dashboard-list-for-cleanup');
        
        // Look specifically for our automation test dashboards
        const response = await askUser(`\n❓ Can you see any dashboards starting with "${this.testDashboardPrefix}" in the sidebar? (yes/no): `);
        
        if (response === 'yes' || response === 'y') {
            const dashboards = await askUser(`🔍 Which ${this.testDashboardPrefix} dashboards do you see? (list them): `);
            console.log(`📝 Automation test dashboards found: ${dashboards}`);
            
            const shouldDelete = await askUser('🗑️ Should I try to delete these automation test dashboards now? (yes/no): ');
            
            if (shouldDelete === 'yes' || shouldDelete === 'y') {
                return await this.deleteTestDashboards(dashboards);
            } else {
                console.log('⚠️ Skipping cleanup - will proceed with existing dashboards');
                return true;
            }
        } else {
            console.log(`✅ No ${this.testDashboardPrefix} dashboards found - ready to create new one`);
            return true;
        }
    }

    async deleteTestDashboards(dashboardList) {
        console.log('🗑️ Attempting to delete automation test dashboards...');
        
        const dashboardNames = dashboardList.split(',').map(name => name.trim());
        
        for (const dashboardName of dashboardNames) {
            if (!dashboardName) continue;
            
            // Safety check - only delete dashboards with our prefix
            if (!dashboardName.includes(this.testDashboardPrefix)) {
                console.log(`⚠️ Skipping ${dashboardName} - not an automation test dashboard`);
                continue;
            }
            
            console.log(`🗑️ Trying to delete: ${dashboardName}`);
            
            try {
                // Find the dashboard span
                const dashboardSpan = await this.page.$(`span.name---_8bc6:has-text("${dashboardName}")`);
                if (!dashboardSpan) {
                    console.log(`⚠️ Could not find dashboard: ${dashboardName}`);
                    continue;
                }
                
                // Get the parent link
                const dashboardLink = await dashboardSpan.evaluateHandle(span => span.closest('a'));
                
                // Check if this dashboard is active, and switch away if needed
                const isActive = await dashboardLink.evaluate(link => link.classList.contains('active'));
                
                if (isActive) {
                    console.log(`⚠️ ${dashboardName} is active, need to switch away first`);
                    const switchAway = await askUser(`🔄 ${dashboardName} is the active dashboard. Should I try to switch to another dashboard first? (yes/no): `);
                    
                    if (switchAway === 'yes' || switchAway === 'y') {
                        // Try to find a non-test dashboard to click
                        const nonTestDashboards = await this.page.$$eval('span.name---_8bc6', spans => 
                            spans.map(span => span.textContent?.trim())
                                .filter(text => text && !text.includes('AUTO-TEST-') && !text.includes('Dashboard') && !text.includes('Test'))
                        );
                        
                        if (nonTestDashboards.length > 0) {
                            const targetDashboard = nonTestDashboards[0];
                            console.log(`🔄 Switching to: ${targetDashboard}`);
                            
                            const targetSpan = await this.page.$(`span.name---_8bc6:has-text("${targetDashboard}")`);
                            if (targetSpan) {
                                const targetLink = await targetSpan.evaluateHandle(span => span.closest('a'));
                                await targetLink.click();
                                await this.page.waitForTimeout(2000);
                                console.log(`✅ Switched to: ${targetDashboard}`);
                            }
                        }
                    }
                }
                
                // Now try to delete
                await dashboardLink.hover();
                await this.page.waitForTimeout(1500);
                console.log(`🔍 Hovering over ${dashboardName}`);
                
                const menuButton = await this.page.waitForSelector('button.openContextMenuButton---_8f4e', { timeout: 5000 });
                await menuButton.click();
                await this.page.waitForTimeout(1000);
                console.log(`🎯 Opened menu for ${dashboardName}`);
                
                const deleteButton = await this.page.waitForSelector('span.menuItemLabel---f5516:has-text("Delete")', { timeout: 3000 });
                await deleteButton.click();
                await this.page.waitForTimeout(1000);
                
                // Handle confirmation if it appears
                try {
                    const confirmButton = await this.page.waitForSelector('button:has-text("Delete")', { timeout: 3000 });
                    await confirmButton.click();
                    console.log(`✅ Confirmed deletion of ${dashboardName}`);
                } catch (e) {
                    console.log(`ℹ️ No confirmation needed for ${dashboardName}`);
                }
                
                await this.page.waitForTimeout(2000);
                console.log(`✅ Deleted: ${dashboardName}`);
                
                const confirmDeletion = await askUser(`❓ Was ${dashboardName} successfully deleted? (yes/no): `);
                if (confirmDeletion !== 'yes' && confirmDeletion !== 'y') {
                    console.log(`⚠️ Deletion of ${dashboardName} may have failed`);
                }
                
            } catch (error) {
                console.log(`❌ Failed to delete ${dashboardName}: ${error.message}`);
                const feedback = await askUser(`🔍 Could not delete ${dashboardName}. What do you see? Should I continue? (yes/no): `);
                if (feedback !== 'yes' && feedback !== 'y') {
                    return false;
                }
            }
        }
        
        await this.takeScreenshot('after-cleanup');
        console.log('✅ Cleanup attempt completed');
        return true;
    }

    async step3_CreateDashboard() {
        console.log('\n📊 STEP 3: Create new test dashboard');
        
        const dashboardName = this.generateTestDashboardName();
        console.log(`🎯 Creating dashboard: ${dashboardName}`);
        
        console.log('Looking for "New dashboard" button...');
        
        try {
            const newDashboardButton = await this.page.waitForSelector('button:has-text("New dashboard")', { timeout: 10000 });
            await newDashboardButton.click();
            console.log('🔄 Clicked "New dashboard" button');
            
            await this.page.waitForTimeout(3000);
            await this.takeScreenshot('after-new-dashboard-click');
            
            const response = await askUser('\n❓ Did a new dashboard get created? Are you now on a dashboard edit page? (yes/no): ');
            
            if (response === 'yes' || response === 'y') {
                console.log('✅ Dashboard creation successful!');
                
                // Try to rename the dashboard to our test name
                const shouldRename = await askUser(`🏷️ Should I try to rename this dashboard to "${dashboardName}"? (yes/no): `);
                
                if (shouldRename === 'yes' || shouldRename === 'y') {
                    const renameSuccess = await this.renameDashboard(dashboardName);
                    if (renameSuccess) {
                        this.createdDashboards.push(dashboardName);
                        console.log(`📝 Tracking created dashboard: ${dashboardName}`);
                    }
                } else {
                    // Ask what the dashboard name is
                    const actualName = await askUser('🔍 What is the current name of the dashboard? ');
                    this.createdDashboards.push(actualName);
                    console.log(`📝 Tracking created dashboard: ${actualName}`);
                }
                
                return true;
            } else {
                const feedback = await askUser('🔍 What happened instead? Describe what you see: ');
                console.log(`📝 User feedback: ${feedback}`);
                return false;
            }
            
        } catch (error) {
            console.log('❌ Could not find "New dashboard" button');
            await this.takeScreenshot('new-dashboard-button-not-found');
            
            const feedback = await askUser('🔍 Can you see a "New dashboard" button anywhere? Describe what you see: ');
            console.log(`📝 User feedback: ${feedback}`);
            return false;
        }
    }

    async renameDashboard(newName) {
        console.log(`🏷️ Attempting to rename dashboard to: ${newName}`);
        console.log('🎯 Looking for 3-dots menu (dashboard options)...');
        
        try {
            // Look for 3-dots menu button (various selectors it might use)
            const menuSelectors = [
                'button[aria-label*="menu"]',
                'button[aria-label*="options"]',
                'button:has(svg)',
                '.menu-button',
                '[data-testid*="menu"]',
                'button.more-options'
            ];
            
            let menuButton = null;
            for (const selector of menuSelectors) {
                const elements = await this.page.$$(selector);
                for (const element of elements) {
                    // Check if it looks like a 3-dots menu (has multiple dots or lines)
                    const innerHTML = await element.innerHTML();
                    if (innerHTML.includes('•') || innerHTML.includes('⋮') || innerHTML.includes('...') || 
                        innerHTML.includes('circle') || innerHTML.includes('dot')) {
                        menuButton = element;
                        console.log(`✅ Found potential 3-dots menu with selector: ${selector}`);
                        break;
                    }
                }
                if (menuButton) break;
            }
            
            if (!menuButton) {
                console.log('❌ Could not find 3-dots menu automatically');
                const guidance = await askUser('🔍 Can you see a 3-dots menu or options button? Describe where it is: ');
                console.log(`📝 User guidance: ${guidance}`);
                
                // Try manual approach
                const manualClick = await askUser('🖱️ Should I try a different approach? Can you click the 3-dots menu manually and then type "yes" when ready? (yes/no): ');
                if (manualClick !== 'yes' && manualClick !== 'y') {
                    return false;
                }
            } else {
                // Click the 3-dots menu
                await menuButton.click();
                console.log('🔄 Clicked 3-dots menu');
                await this.page.waitForTimeout(1000);
                await this.takeScreenshot('menu-opened');
            }
            
            // Look for "Rename" option
            console.log('🔍 Looking for "Rename" option...');
            
            const renameSelectors = [
                'text=Rename',
                '*:has-text("Rename")',
                'button:has-text("Rename")',
                'a:has-text("Rename")',
                '[data-testid*="rename"]'
            ];
            
            let renameOption = null;
            for (const selector of renameSelectors) {
                renameOption = await this.page.$(selector);
                if (renameOption) {
                    console.log(`✅ Found Rename option with selector: ${selector}`);
                    break;
                }
            }
            
            if (!renameOption) {
                const menuItems = await askUser('🔍 What menu options do you see? Can you see "Rename"? ');
                console.log(`📝 Menu items: ${menuItems}`);
                
                if (menuItems.toLowerCase().includes('rename')) {
                    const proceed = await askUser('🖱️ Please click "Rename" manually and type "ready" when the title becomes editable: ');
                    if (proceed.toLowerCase() !== 'ready') {
                        return false;
                    }
                } else {
                    return false;
                }
            } else {
                // Click Rename
                await renameOption.click();
                console.log('🔄 Clicked Rename option');
                await this.page.waitForTimeout(1000);
                await this.takeScreenshot('rename-clicked');
            }
            
            // Now look for the editable title field
            console.log('🔍 Looking for editable title field...');
            
            const titleSelectors = [
                'input[value*="Dashboard"]',
                'input[placeholder*="dashboard"]',
                'input[type="text"]',
                '[contenteditable="true"]',
                'textarea'
            ];
            
            let titleElement = null;
            for (const selector of titleSelectors) {
                titleElement = await this.page.$(selector);
                if (titleElement) {
                    console.log(`✅ Found title input with selector: ${selector}`);
                    break;
                }
            }
            
            if (!titleElement) {
                const editableCheck = await askUser('❓ Do you see an editable title field now? (yes/no): ');
                if (editableCheck === 'yes' || editableCheck === 'y') {
                    const proceed = await askUser(`🖱️ Please clear the current title and type "${newName}" then type "done": `);
                    if (proceed.toLowerCase() === 'done') {
                        await this.takeScreenshot('manual-rename-complete');
                        console.log(`✅ Dashboard manually renamed to: ${newName}`);
                        return true;
                    }
                }
                return false;
            }
            
            // Clear and set the new name
            await titleElement.click();
            await this.page.waitForTimeout(500);
            
            // Select all and replace
            await this.page.keyboard.press('Control+a'); // Select all (Cmd+a on Mac)
            await this.page.keyboard.press('Meta+a'); // Also try Cmd+a for Mac
            await titleElement.fill(newName); // Use fill instead of keyboard.type for reliability
            await this.page.keyboard.press('Enter');
            
            await this.page.waitForTimeout(1500);
            await this.takeScreenshot('dashboard-renamed');
            
            const renameWorked = await askUser(`❓ Was the dashboard successfully renamed to "${newName}"? (yes/no): `);
            
            if (renameWorked === 'yes' || renameWorked === 'y') {
                console.log(`✅ Dashboard renamed to: ${newName}`);
                this.createdDashboards.push(newName);
                return true;
            } else {
                console.log('❌ Dashboard rename failed');
                return false;
            }
            
        } catch (error) {
            console.log(`❌ Error renaming dashboard: ${error.message}`);
            const fallback = await askUser('🛠️ Rename failed. Should we continue without renaming? (yes/no): ');
            return fallback === 'yes' || fallback === 'y';
        }
    }

    async step4_AddWidget() {
        console.log('\n🎯 STEP 4: Add Zendesk widget');
        
        console.log('Looking for "Add Widget" button...');
        
        try {
            const addWidgetButton = await this.page.waitForSelector('button:has-text("Add Widget"), button:has-text("Add widget")', { timeout: 10000 });
            await addWidgetButton.click();
            console.log('🔄 Clicked "Add Widget" button');
            
            await this.page.waitForTimeout(3000);
            await this.takeScreenshot('widget-selection-opened');
            
            const response = await askUser('\n❓ Did a widget selection panel/slideout open? Can you see integration options? (yes/no): ');
            
            if (response === 'yes' || response === 'y') {
                console.log('✅ Widget selection opened!');
                
                // Look for Zendesk Support using the exact selector from inspection
                console.log('Looking for Zendesk Support option using specific selector...');
                
                try {
                    // Use the exact selector from the HTML inspection
                    const zendeskSelector = 'a[data-service-name="zendesk3"].link---_b81f4, a[href*="zendesk3"]';
                    const zendeskOption = await this.page.waitForSelector(zendeskSelector, { timeout: 8000 });
                    
                    console.log('✅ Found Zendesk Support with exact selector');
                    await zendeskOption.click();
                    console.log('🔄 Clicked Zendesk Support');
                    
                    // Wait longer for the next panel to load
                    await this.page.waitForTimeout(4000);
                    await this.takeScreenshot('zendesk-selected');
                    
                    const zendeskWorked = await askUser('\n❓ Did clicking Zendesk Support work? What happened next? (describe): ');
                    console.log(`📝 User feedback: ${zendeskWorked}`);
                    
                    // Continue to next step based on feedback
                    const continueToConfig = await askUser('🔧 Should we continue to configure the Zendesk widget? (yes/no): ');
                    if (continueToConfig === 'yes' || continueToConfig === 'y') {
                        return await this.step5_ConfigureZendeskWidget();
                    }
                    
                    return true;
                    
                } catch (error) {
                    console.log('❌ Could not click Zendesk Support with specific selector');
                    console.log('🔄 Trying fallback selectors...');
                    
                    // Fallback selectors
                    const fallbackSelectors = [
                        'a:has-text("Zendesk Support")',
                        'div:has-text("Zendesk Support")',
                        'button:has-text("Zendesk Support")',
                        '[data-service-name="zendesk3"]'
                    ];
                    
                    let success = false;
                    for (const selector of fallbackSelectors) {
                        try {
                            const element = await this.page.waitForSelector(selector, { timeout: 3000 });
                            await element.click();
                            console.log(`🔄 Clicked with fallback selector: ${selector}`);
                            await this.page.waitForTimeout(3000);
                            success = true;
                            break;
                        } catch (e) {
                            console.log(`⚠️ Fallback selector failed: ${selector}`);
                        }
                    }
                    
                    if (!success) {
                        const feedback = await askUser('🔍 I tried multiple selectors but failed. What do you see? How should I click Zendesk Support? ');
                        console.log(`📝 User feedback: ${feedback}`);
                        return false;
                    }
                    
                    await this.takeScreenshot('zendesk-fallback-selected');
                    const continueToConfig = await askUser('🔧 Should we continue to configure the Zendesk widget? (yes/no): ');
                    if (continueToConfig === 'yes' || continueToConfig === 'y') {
                        return await this.step5_ConfigureZendeskWidget();
                    }
                    return true;
                }
                
            } else {
                const feedback = await askUser('🔍 What happened instead? Describe what you see: ');
                console.log(`📝 User feedback: ${feedback}`);
                return false;
            }
            
        } catch (error) {
            console.log('❌ Could not find "Add Widget" button');
            await this.takeScreenshot('add-widget-button-not-found');
            
            const feedback = await askUser('🔍 Can you see an "Add Widget" button anywhere? Describe what you see: ');
            console.log(`📝 User feedback: ${feedback}`);
            return false;
        }
    }

    async step5_ConfigureZendeskWidget() {
        console.log('\n🔧 STEP 5: Configure Zendesk widget for First Reply Time');
        
        await this.takeScreenshot('zendesk-config-start');
        
        const whatDoYouSee = await askUser('🔍 What do you see now? Describe the Zendesk configuration options: ');
        console.log(`📝 User feedback: ${whatDoYouSee}`);
        
        // Look for First Reply Time using the exact selector from inspection
        console.log('🎯 Looking for "First reply time" using specific selector...');
        
        try {
            // Use the exact class from the HTML inspection
            const firstReplyTimeSelector = 'span.title---_3e44:has-text("First reply time")';
            const firstReplyTimeOption = await this.page.waitForSelector(firstReplyTimeSelector, { timeout: 8000 });
            
            console.log('✅ Found First Reply Time with exact selector');
            await firstReplyTimeOption.click();
            console.log('🔄 Clicked First Reply Time');
            
            await this.page.waitForTimeout(3000);
            await this.takeScreenshot('first-reply-time-selected');
            
            const configResult = await askUser('❓ Did clicking First Reply Time work? What happened? (describe): ');
            console.log(`📝 User feedback: ${configResult}`);
            
            // Check if we need to configure time period to "today"
            const needsTimeConfig = await askUser('🕐 Do you see time period options? Should we set it to "today"? (yes/no): ');
            
            if (needsTimeConfig === 'yes' || needsTimeConfig === 'y') {
                return await this.configureTimePeriod();
            }
            
            return true;
            
        } catch (error) {
            console.log('❌ Could not click First Reply Time with specific selector');
            console.log('🔄 Trying fallback selectors...');
            
            // Fallback selectors for First Reply Time
            const fallbackSelectors = [
                '*:has-text("First reply time")',
                '*:has-text("First Reply Time")', 
                'div:has-text("First reply time")',
                'button:has-text("First reply time")',
                'a:has-text("First reply time")',
                '.title---_3e44'
            ];
            
            let success = false;
            for (const selector of fallbackSelectors) {
                try {
                    const element = await this.page.waitForSelector(selector, { timeout: 3000 });
                    await element.click();
                    console.log(`🔄 Clicked with fallback selector: ${selector}`);
                    await this.page.waitForTimeout(3000);
                    success = true;
                    break;
                } catch (e) {
                    console.log(`⚠️ Fallback selector failed: ${selector}`);
                }
            }
            
            if (!success) {
                const guidance = await askUser('🔍 I tried multiple selectors but failed. What options do you see? Can you guide me to First Reply Time? ');
                console.log(`📝 User guidance: ${guidance}`);
                return false;
            }
            
            await this.takeScreenshot('first-reply-time-fallback-selected');
            return true;
        }
    }

    async configureTimePeriod() {
        console.log('\n⏰ STEP 6: Configure time period to "today"');
        
        await this.takeScreenshot('time-period-config-start');
        
        const timeOptions = await askUser('🔍 What time period options do you see? Describe them: ');
        console.log(`📝 Time options: ${timeOptions}`);
        
        // Look for "today" option
        const todaySelectors = [
            '*:has-text("today")',
            '*:has-text("Today")',
            'option:has-text("today")',
            'option:has-text("Today")',
            'button:has-text("today")',
            'button:has-text("Today")'
        ];
        
        let todaySelected = false;
        for (const selector of todaySelectors) {
            try {
                const todayOption = await this.page.waitForSelector(selector, { timeout: 3000 });
                await todayOption.click();
                console.log(`🔄 Clicked "today" with selector: ${selector}`);
                await this.page.waitForTimeout(2000);
                todaySelected = true;
                break;
            } catch (e) {
                console.log(`⚠️ Today selector failed: ${selector}`);
            }
        }
        
        if (!todaySelected) {
            const guidance = await askUser('🔍 I could not find "today" option automatically. Can you guide me to select "today"? ');
            console.log(`📝 User guidance: ${guidance}`);
        }
        
        await this.takeScreenshot('time-period-configured');
        
        const addFilter = await askUser('➕ Should we add a filter for solved tickets? (yes/no): ');
        
        if (addFilter === 'yes' || addFilter === 'y') {
            return await this.addTicketFilter();
        }
        
        return true;
    }

    async addTicketFilter() {
        console.log('\n🔍 STEP 7: Add filter for solved tickets');
        
        const filterOptions = await askUser('➕ Can you see a "+" button or "Add filter" option? Describe what you see: ');
        console.log(`📝 Filter options: ${filterOptions}`);
        
        // Look for add filter button
        const addFilterSelectors = [
            'button:has-text("+")',
            'button:has-text("Add filter")',
            'button:has-text("Add Filter")',
            '*:has-text("Add filter")',
            '.add-filter',
            '[data-testid*="filter"]'
        ];
        
        let filterAdded = false;
        for (const selector of addFilterSelectors) {
            try {
                const addButton = await this.page.waitForSelector(selector, { timeout: 3000 });
                await addButton.click();
                console.log(`🔄 Clicked add filter with selector: ${selector}`);
                await this.page.waitForTimeout(2000);
                filterAdded = true;
                break;
            } catch (e) {
                console.log(`⚠️ Add filter selector failed: ${selector}`);
            }
        }
        
        if (!filterAdded) {
            const guidance = await askUser('🔍 I could not find add filter button. Can you guide me or click it manually? ');
            console.log(`📝 User guidance: ${guidance}`);
        }
        
        await this.takeScreenshot('filter-options');
        
        const completion = await askUser('🎯 Filter configuration opened. Should we complete the widget setup? This completes our automation test. (yes/no): ');
        
        if (completion === 'yes' || completion === 'y') {
            console.log('🎉 Widget configuration completed successfully!');
            console.log('✅ Automation test completed - Zendesk First Reply Time widget configured');
        }
        
        return true;
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        
        if (this.createdDashboards.length > 0) {
            console.log(`📝 Dashboards created this session: ${this.createdDashboards.join(', ')}`);
            
            const cleanupCreated = await askUser('🗑️ Should I try to delete the dashboards I created this session? (yes/no): ');
            
            if (cleanupCreated === 'yes' || cleanupCreated === 'y') {
                // Navigate back to dashboard list
                await this.page.goto('https://app.geckoboard.com/');
                await this.page.waitForTimeout(2000);
                
                for (const dashboardName of this.createdDashboards) {
                    const deleteSuccess = await this.deleteSingleDashboard(dashboardName);
                    console.log(`${deleteSuccess ? '✅' : '❌'} Cleanup ${dashboardName}: ${deleteSuccess ? 'success' : 'failed'}`);
                }
            }
        }
        
        const keepOpen = await askUser('❓ Should I keep the browser open for you to continue manually? (yes/no): ');
        
        if (keepOpen !== 'yes' && keepOpen !== 'y') {
            await this.browser.close();
            console.log('✅ Browser closed');
        } else {
            console.log('🔍 Browser staying open for manual exploration');
        }
        
        rl.close();
    }

    async deleteSingleDashboard(dashboardName) {
        try {
            const dashboardSpan = await this.page.$(`span.name---_8bc6:has-text("${dashboardName}")`);
            if (!dashboardSpan) {
                console.log(`⚠️ Could not find dashboard: ${dashboardName}`);
                return false;
            }
            
            const dashboardLink = await dashboardSpan.evaluateHandle(span => span.closest('a'));
            await dashboardLink.hover();
            await this.page.waitForTimeout(1000);
            
            const menuButton = await this.page.waitForSelector('button.openContextMenuButton---_8f4e', { timeout: 3000 });
            await menuButton.click();
            await this.page.waitForTimeout(500);
            
            const deleteButton = await this.page.waitForSelector('span.menuItemLabel---f5516:has-text("Delete")', { timeout: 2000 });
            await deleteButton.click();
            
            try {
                const confirmButton = await this.page.waitForSelector('button:has-text("Delete")', { timeout: 2000 });
                await confirmButton.click();
            } catch (e) {
                // No confirmation needed
            }
            
            await this.page.waitForTimeout(1000);
            return true;
            
        } catch (error) {
            console.log(`❌ Error deleting ${dashboardName}: ${error.message}`);
            return false;
        }
    }

    async run() {
        try {
            await this.initialize();
            
            // Step 1: Login
            const loginSuccess = await this.step1_Login();
            if (!loginSuccess) {
                console.log('❌ Stopping - login failed');
                await this.cleanup();
                return;
            }
            
            // Step 2: Clean up BEFORE creating new dashboard
            const cleanupSuccess = await this.step2_CleanupTestDashboards();
            if (!cleanupSuccess) {
                console.log('❌ Stopping - cleanup failed');
                await this.cleanup();
                return;
            }
            
            // Step 3: Create dashboard
            const dashboardSuccess = await this.step3_CreateDashboard();
            if (!dashboardSuccess) {
                console.log('❌ Stopping - dashboard creation failed');
                await this.cleanup();
                return;
            }
            
            // Step 4: Add widget
            const widgetSuccess = await this.step4_AddWidget();
            if (!widgetSuccess) {
                console.log('❌ Stopping - widget addition failed');
                await this.cleanup();
                return;
            }
            
            console.log('\n🎉 Interactive automation completed successfully!');
            console.log('�� Ready for the full Zendesk widget configuration workflow');
            console.log(`📋 Created dashboards this session: ${this.createdDashboards.join(', ')}`);
            
            await this.cleanup();
            
        } catch (error) {
            console.error('💥 Error:', error.message);
            await this.cleanup();
        }
    }
}

// Run the interactive automation
const automation = new InteractiveAutomation();
automation.run(); 