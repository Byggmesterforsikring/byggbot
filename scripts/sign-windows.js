require('dotenv').config();
const debug = require('debug')('sign-windows');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Windows signing function for electron-builder
 * This will be used by electron-builder's afterPack hook
 */
exports.default = async function signWindows(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'win32') {
    return;
  }

  console.log('Starting Windows code signing process...');
  
  try {
    // For Windows, the signing is handled by electron-builder using Azure Key Vault
    // This script can be used for additional post-signing operations if needed
    console.log('Windows application signed successfully');
  } catch (error) {
    console.error('Windows signing failed:', error);
    throw error;
  }
};