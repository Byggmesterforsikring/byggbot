const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: '.env.production' });

async function testAppleAPI() {
    console.log('Testing Apple API credentials...');

    // Check environment variables
    const requiredVars = ['APPLE_API_KEY_PATH', 'APPLE_API_KEY_ID', 'APPLE_API_ISSUER_ID', 'APPLE_TEAM_ID'];
    console.log('\n=== Environment Variables ===');

    for (const varName of requiredVars) {
        const value = process.env[varName];
        console.log(`${varName}: ${value ? '✓ Set' : '✗ Missing'}`);
        if (value) {
            console.log(`  Value: ${value}`);
        }
    }

    // Check API key file
    console.log('\n=== API Key File ===');
    const apiKeyPath = path.resolve(process.env.APPLE_API_KEY_PATH);
    const fileExists = fs.existsSync(apiKeyPath);
    console.log(`API Key Path: ${apiKeyPath}`);
    console.log(`File exists: ${fileExists ? '✓ Yes' : '✗ No'}`);

    if (fileExists) {
        const stats = fs.statSync(apiKeyPath);
        console.log(`File size: ${stats.size} bytes`);
        console.log(`Last modified: ${stats.mtime}`);

        // Read file content to verify format
        const content = fs.readFileSync(apiKeyPath, 'utf8');
        const isValidFormat = content.includes('-----BEGIN PRIVATE KEY-----') && content.includes('-----END PRIVATE KEY-----');
        console.log(`Valid P8 format: ${isValidFormat ? '✓ Yes' : '✗ No'}`);
    }

    console.log('\n=== Troubleshooting Guide ===');
    console.log('If notarization fails with "provider does not exist":');
    console.log('1. Log into App Store Connect: https://appstoreconnect.apple.com');
    console.log('2. Go to Users and Access → Integrations → API Keys');
    console.log('3. Verify API key with ID', process.env.APPLE_API_KEY_ID, 'is Active');
    console.log('4. Check that Issuer ID matches:', process.env.APPLE_API_ISSUER_ID);
    console.log('5. Ensure API key has "App Manager" or "Admin" role (not just "Developer")');
    console.log('6. Verify Team ID matches your Apple Developer account:', process.env.APPLE_TEAM_ID);
    console.log('\nIf the API key was recently created or modified, it may take a few minutes to become active.');
}

// Run the test
testAppleAPI().catch(console.error); 