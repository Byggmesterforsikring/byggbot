const dotenv = require('dotenv');

// Load environment variables from .env.production if NODE_ENV is production
if (process.env.NODE_ENV === 'production') {
  console.log('Loading .env.production for production build');
  dotenv.config({ path: '.env.production' });
} else {
  console.log('Loading .env for development build');
  dotenv.config();
}
const { notarize } = require('@electron/notarize');
const path = require('path');
const debug = require('debug')('notarize');
const fs = require('fs');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  
  // Handle Mac notarization
  if (electronPlatformName === 'darwin') {
    await notarizeMac(context, appOutDir);
  } 
  // For Windows, the signing is configured in the package.json
  else if (electronPlatformName === 'win32') {
    console.log('Windows build detected.');
    console.log('Windows code signing is handled by scripts/azure-signing.js');
    console.log('Using Azure Key Vault certificate:', process.env.AZURE_KEY_VAULT_CERT_ID);
    
    console.log('Continuing with build process...');
  }
};

/**
 * Function to handle Mac notarization
 */
async function notarizeMac(context, appOutDir) {
  const appName = context.packager.appInfo.productFilename;
  const appId = context.packager.appInfo.id;

  console.log('Starting Mac notarization process...');
  console.log('App path:', path.join(appOutDir, `${appName}.app`));

  // Log environment variables
  console.log('Environment variables:');
  console.log('APPLE_API_KEY_PATH:', process.env.APPLE_API_KEY_PATH);
  console.log('Absolute APPLE_API_KEY_PATH:', path.resolve(process.env.APPLE_API_KEY_PATH));
  console.log('APPLE_API_KEY_ID:', process.env.APPLE_API_KEY_ID);
  console.log('APPLE_API_ISSUER_ID:', process.env.APPLE_API_ISSUER_ID);
  console.log('APPLE_TEAM_ID:', process.env.APPLE_TEAM_ID);
  
  // Check if the file exists
  try {
    const apiKeyPath = path.resolve(process.env.APPLE_API_KEY_PATH);
    const fileExists = fs.existsSync(apiKeyPath);
    console.log('API key file exists:', fileExists);
  } catch (error) {
    console.error('Error checking API key file:', error);
  }

  try {
    const startTime = Date.now();
    const apiKeyPath = path.resolve(process.env.APPLE_API_KEY_PATH);
    console.log('Using absolute path for API key:', apiKeyPath);
    
    await notarize({
      appBundleId: appId,
      appPath: path.join(appOutDir, `${appName}.app`),
      appleApiKey: apiKeyPath,
      appleApiKeyId: process.env.APPLE_API_KEY_ID,
      appleApiIssuer: process.env.APPLE_API_ISSUER_ID,
      tool: 'notarytool',
      appleTeamId: process.env.APPLE_TEAM_ID,
      logger: debug,
      timeout: 600000, // 10 minutes timeout
    });

    const duration = (Date.now() - startTime) / 1000;
    console.log(`Mac notarization completed successfully in ${duration} seconds`);
  } catch (error) {
    console.error('Mac notarization failed:', error);
    if (error.message.includes('timeout')) {
      console.log('The notarization process timed out. You may want to check the status manually. Refer to the README.md for more information.');
    }
    throw error;
  }
} 