const isDev = process.env.NODE_ENV === 'development';

// Dev-konfigurasjon bruker msal-browser med popup
const devConfig = {
    AZURE_CLIENT_ID: '2b8dbbbc-7d30-4411-a7d5-3c1f3111acf9',
    AZURE_TENANT_ID: 'b1de1611-acc1-4b39-b0c1-c209af9f198e'
};

// Prod-konfigurasjon bruker msal-node med Electron
const prodConfig = {
    AZURE_CLIENT_ID: process.env.REACT_APP_AZURE_CLIENT_ID,
    AZURE_TENANT_ID: process.env.REACT_APP_AZURE_TENANT_ID
};

module.exports = isDev ? devConfig : prodConfig; 