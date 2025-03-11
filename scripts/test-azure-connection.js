require('dotenv').config();
const { testAzureKeyVaultConnection } = require('./azure-signing');

async function main() {
  try {
    console.log('Testing connection to Azure Key Vault...');
    const success = await testAzureKeyVaultConnection();
    
    if (success) {
      console.log('Successfully connected to Azure Key Vault!');
      process.exit(0);
    } else {
      console.error('Failed to connect to Azure Key Vault. Check your credentials and try again.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error testing Azure Key Vault connection:', error);
    process.exit(1);
  }
}

main();