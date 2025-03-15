const dotenv = require('dotenv');

// Load environment variables from .env files, falling back if not found
const envFiles = [
  process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
  '.env'
];

let envLoaded = false;
for (const envFile of envFiles) {
  try {
    console.log(`Attempting to load environment from ${envFile}`);
    const result = dotenv.config({ path: envFile });
    if (result.parsed) {
      console.log(`Successfully loaded environment from ${envFile}`);
      envLoaded = true;
      break;
    }
  } catch (error) {
    console.log(`Error loading ${envFile}: ${error.message}`);
  }
}

if (!envLoaded) {
  console.warn('WARNING: Could not load any environment files. Using existing environment variables.');
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

  // Check for required environment variables
  const requiredVars = ['APPLE_API_KEY_PATH', 'APPLE_API_KEY_ID', 'APPLE_API_ISSUER_ID', 'APPLE_TEAM_ID'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`ERROR: Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Mac notarization will be skipped.');
    console.error('To notarize, make sure you have an .env or .env.production file with these variables.');
    return; // Exit notarization but don't fail the build
  }

  // Log environment variables
  console.log('Environment variables:');
  console.log('APPLE_API_KEY_PATH:', process.env.APPLE_API_KEY_PATH);
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

  // Retry configuration
  const maxRetries = 3;
  let retryCount = 0;
  let lastError = null;

  while (retryCount < maxRetries) {
    try {
      const startTime = Date.now();
      const apiKeyPath = path.resolve(process.env.APPLE_API_KEY_PATH);
      console.log(`Notarization attempt ${retryCount + 1}/${maxRetries}`);
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
        timeout: 1800000, // 30 minutes timeout (increased from 10 minutes)
      });

      const duration = (Date.now() - startTime) / 1000;
      console.log(`Mac notarization completed successfully in ${duration} seconds`);
      return; // Success - exit the function
    } catch (error) {
      lastError = error;
      retryCount++;
      console.error(`Mac notarization attempt ${retryCount}/${maxRetries} failed:`, error);
      
      // Check if error is timeout or upload related
      if (error.message.includes('timeout') || error.message.includes('abortedUpload')) {
        console.log(`Notarization timed out or upload failed. Retrying in 10 seconds... (Attempt ${retryCount}/${maxRetries})`);
        if (retryCount < maxRetries) {
          // Wait 10 seconds before retrying
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      } else {
        // For other errors, don't retry
        console.error('Mac notarization failed with non-recoverable error:', error);
        break;
      }
    }
  }

  // If we've exhausted all retries
  console.error(`Mac notarization failed after ${maxRetries} attempts`);
  if (lastError && lastError.message.includes('timeout')) {
    console.log('The notarization process timed out. You may want to check the status manually. Refer to the README.md for more information.');
  }
  throw lastError;
} 