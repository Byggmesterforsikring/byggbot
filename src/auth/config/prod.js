const { PublicClientApplication } = require('@azure/msal-node');

const setupProdAuth = () => {
    const msalConfig = {
        auth: {
            clientId: process.env.REACT_APP_AZURE_CLIENT_ID,
            authority: `https://login.microsoftonline.com/${process.env.REACT_APP_AZURE_TENANT_ID}`,
            redirectUri: process.env.REACT_APP_REDIRECT_URI
        }
    };

    return {
        client: new PublicClientApplication(msalConfig),
        loginRequest: {
            scopes: ['user.read'],
            prompt: 'select_account'
        }
    };
};

module.exports = { setupProdAuth }; 