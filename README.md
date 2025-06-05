# Geckoboard Automation with Playwright

This project automates the creation of Geckoboard dashboards with Zendesk widgets using Playwright. It's designed as a proof of concept for web automation and demonstrates best practices for browser automation.

## 🎯 Project Goals

- Create a new Geckoboard dashboard
- Add a Zendesk widget configured for "first reply time in business hours for today's solved tickets"
- Capture screenshots and logs of the entire process
- Serve as a template for future web automation projects

## 🛠️ Setup Instructions

### Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)
- A Geckoboard account with admin privileges
- Zendesk integration configured in Geckoboard

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/tpottttt/geckoboard-automation.git
   cd geckoboard-automation
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install Playwright browsers:**
   ```bash
   npm run install-browsers
   ```

## 🚀 Usage

### Running the Automation

```bash
npm run run
```

Or directly with Node.js:
```bash
node src/geckoboard-automation.js
```

### Configuration

The automation is configured with the following settings in `src/geckoboard-automation.js`:

- **Email:** taylor.potter@therealbrokerage.com
- **Password:** RealTaylor!
- **Base URL:** https://www.geckoboard.com
- **Headless Mode:** false (browser will be visible)
- **Timeout:** 30 seconds

To run in headless mode (invisible browser), change `headless: false` to `headless: true` in the configuration.

## 📊 What the Automation Does

1. **Initialize Browser:** Launches Chromium with a 1920x1080 viewport
2. **Login:** Navigates to Geckoboard and logs in with provided credentials
3. **Create Dashboard:** Creates a new dashboard named "Zendesk First Reply Time Dashboard"
4. **Add Widget:** Adds a new widget and selects Zendesk as the data source
5. **Configure Widget:** Configures the widget for:
   - Metric: First Reply Time
   - Time Range: Today
   - Status: Solved tickets
   - Business Hours: Enabled
6. **Save & Finalize:** Saves the configuration and captures final state

## 📸 Output Files

After running the automation, you'll find:

- **`automation-log.txt`** - Detailed timestamped log of all operations
- **`dashboard-url.txt`** - URL of the created dashboard
- **`screenshots/`** - Folder containing step-by-step screenshots:
  - `step-01-login-page.png`
  - `step-02-credentials-entered.png`
  - `step-03-after-login.png`
  - `step-04-create-dashboard-clicked.png`
  - And more...

## 🔧 Troubleshooting

### Common Issues

1. **Browser not found:** Run `npm run install-browsers`
2. **Login fails:** Verify credentials in the configuration
3. **Elements not found:** The website may have changed - check screenshots to see current state
4. **Timeout errors:** Increase the timeout value in configuration

### Debug Mode

To see what's happening:
- Screenshots are automatically taken at each step
- Check `automation-log.txt` for detailed logs
- Set `headless: false` to watch the browser in action

## 🏗️ Project Structure

```
geckoboard-automation/
├── src/
│   └── geckoboard-automation.js    # Main automation script
├── screenshots/                    # Generated screenshots
├── package.json                   # Node.js dependencies
├── .gitignore                     # Git ignore rules
├── README.md                      # This file
├── automation-log.txt            # Generated log file
└── dashboard-url.txt             # Generated dashboard URL
```

## 🔄 Extending This Automation

This project serves as a template for future automations. To adapt it for other websites:

1. **Update Configuration:** Change URLs, credentials, and selectors
2. **Modify Steps:** Update the step methods for your specific workflow
3. **Add New Methods:** Create additional methods for complex interactions
4. **Update Selectors:** Modify CSS selectors to match target website elements

### Key Patterns Used

- **Robust Element Selection:** Multiple selector strategies for reliability
- **Error Handling:** Try-catch blocks with detailed logging
- **Visual Documentation:** Screenshots at every major step
- **Flexible Configuration:** Easy-to-modify settings
- **Comprehensive Logging:** Timestamped logs for debugging

## 📝 Development Notes

### Playwright Best Practices Implemented

- **Wait Strategies:** Using `waitForLoadState('networkidle')` for dynamic content
- **Multiple Selectors:** Fallback selectors for robust element finding
- **Screenshot Documentation:** Visual proof of automation progress
- **Proper Cleanup:** Browser cleanup in finally blocks
- **Timeout Management:** Configurable timeouts for different operations

### GitHub Integration

This project demonstrates:
- Repository creation via GitHub API
- Proper `.gitignore` configuration
- Professional README documentation
- Structured project organization

## 🤝 Contributing

This is a learning project for web automation. Feel free to:
- Report issues with specific websites
- Suggest improvements to the automation patterns
- Add new automation examples

## 📄 License

MIT License - Feel free to use this as a template for your own automation projects.

---

**Created by:** Taylor Potter  
**Purpose:** Learning Playwright and GitHub for web automation  
**Status:** Proof of Concept
