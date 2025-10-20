const { setupDevAuth } = require('./dev');
const { setupProdAuth } = require('./prod');

const isDev = process.env.NODE_ENV === 'development';

// Factory for å få riktig autentiseringsstrategi
const getAuthStrategy = () => {
    if (isDev) {
        return setupDevAuth();
    }
    return setupProdAuth();
};

module.exports = { getAuthStrategy }; 