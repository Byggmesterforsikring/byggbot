const dotenv = require('dotenv');

// Load environment variables from .env.production if NODE_ENV is production
if (process.env.NODE_ENV === 'production') {
  console.log('Loading .env.production for production build');
  dotenv.config({ path: '.env.production' });
} else {
  console.log('Loading .env for development build');
  dotenv.config();
}
const { ClientSecretCredential } = require('@azure/identity');
const { CertificateClient } = require('@azure/keyvault-certificates');
const path = require('path');
const fs = require('fs');

/**
 * This script is called by electron-builder to dynamically provide signing configuration
 * for Windows code signing using Azure Key Vault
 */
exports.default = async function (configuration) {
  console.log('Configuring Windows signing with Azure Key Vault...');
  
  const certUrl = process.env.AZURE_KEY_VAULT_CERT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const tenantId = process.env.AZURE_TENANT_ID;
  
  if (!certUrl || !clientId || !clientSecret || !tenantId) {
    console.warn('Azure Key Vault credentials are not properly configured');
    return null;
  }
  
  console.log('Azure Key Vault configuration provided for signing');
  
  // Return the signing configuration for electron-builder
  return {
    azureKeyVault: {
      certificateUrl: certUrl,
      clientId: clientId,
      clientSecret: clientSecret,
      tenantId: tenantId,
      timestamp: "http://timestamp.digicert.com" // Legg til tidsstempling
    }
  };
};

/**
 * Test function to verify Azure Key Vault connection
 */
exports.testAzureKeyVaultConnection = async function() {
  try {
    const vaultName = process.env.AZURE_KEY_VAULT_NAME;
    const certName = process.env.AZURE_KEY_VAULT_CERT;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const tenantId = process.env.AZURE_TENANT_ID;
    
    if (!vaultName || !certName || !clientId || !clientSecret || !tenantId) {
      throw new Error('Missing Azure Key Vault credentials');
    }
    
    // Create a credential using client secret
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    
    // Create certificate client
    const vaultUrl = `https://${vaultName}.vault.azure.net`;
    const certificateClient = new CertificateClient(vaultUrl, credential);
    
    // Get certificate
    console.log(`Retrieving certificate ${certName} from ${vaultUrl}`);
    const certificate = await certificateClient.getCertificate(certName);
    
    console.log('Successfully connected to Azure Key Vault and retrieved certificate:');
    console.log(`Certificate name: ${certificate.name}`);
    console.log(`Certificate version: ${certificate.properties.version}`);
    console.log(`Certificate enabled: ${certificate.properties.enabled}`);
    return true;
  } catch (error) {
    console.error('Failed to connect to Azure Key Vault:', error);
    return false;
  }
};