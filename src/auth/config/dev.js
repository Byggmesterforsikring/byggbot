const setupDevAuth = () => {
    return {
        loginRequest: {
            scopes: ['user.read'],
            prompt: 'select_account',
            redirectUri: process.env.REDIRECT_URI_DEV
        }
    };
};

module.exports = { setupDevAuth }; 