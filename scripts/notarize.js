require('dotenv').config();
const { notarize } = require('@electron/notarize');
const path = require('path');
const debug = require('debug')('notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appId = context.packager.appInfo.id;

  console.log('Starting notarization process...');
  console.log('App path:', path.join(appOutDir, `${appName}.app`));

  // Legg til logging av miljøvariabler
  console.log('Environment variables:');
  console.log('APPLE_API_KEY_PATH:', process.env.APPLE_API_KEY_PATH);
  console.log('APPLE_API_KEY_ID:', process.env.APPLE_API_KEY_ID);
  console.log('APPLE_API_ISSUER_ID:', process.env.APPLE_API_ISSUER_ID);
  console.log('APPLE_TEAM_ID:', process.env.APPLE_TEAM_ID);

  try {
    const startTime = Date.now();
    await notarize({
      appBundleId: appId,
      appPath: path.join(appOutDir, `${appName}.app`),
      appleApiKey: process.env.APPLE_API_KEY_PATH,
      appleApiKeyId: process.env.APPLE_API_KEY_ID,
      appleApiIssuer: process.env.APPLE_API_ISSUER_ID,
      tool: 'notarytool',
      appleTeamId: process.env.APPLE_TEAM_ID,
      logger: debug,
      timeout: 600000, // 10 minutes timeout
    });

    const duration = (Date.now() - startTime) / 1000;
    console.log(`Notarization completed successfully in ${duration} seconds`);
  } catch (error) {
    console.error('Notarization failed:', error);
    if (error.message.includes('timeout')) {
      console.log('The notarization process timed out. You may want to check the status manually. Reffer to the README.md for more information.');
    }
    throw error;
  }
}; 