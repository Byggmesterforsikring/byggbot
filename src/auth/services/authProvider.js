import msalClient from './msalConfig';

export async function signIn() {
    const isProd = process.env.NODE_ENV === 'production';
    try {
        const authCodeUrlParameters = {
            scopes: ["user.read"], // Legg til de nødvendige scopes
            redirectUri: isProd
                ? process.env.REDIRECT_URI_PROD
                : process.env.REDIRECT_URI_DEV,
        };
        const authCodeUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);

        if (isProd) {
            // I produksjon åpnes URL-en i standard nettleser (f.eks. via Electron sin shell)
            const { shell } = require('electron');
            shell.openExternal(authCodeUrl);
        } else {
            // I utvikling kan du omdirigere brukeren (f.eks. med Express eller åpne et nytt vindu)
            console.log("Åpner innloggingsside på URL:", authCodeUrl);
            // Her kan du implementere en redirect, f.eks.:
            // res.redirect(authCodeUrl);
        }
    } catch (error) {
        console.error("Feil under generering av auth URL:", error);
    }
}

export async function handleRedirect(authCode) {
    const isProd = process.env.NODE_ENV === 'production';
    const tokenRequest = {
        code: authCode,
        scopes: ["user.read"],
        redirectUri: isProd
            ? process.env.REDIRECT_URI_PROD
            : process.env.REDIRECT_URI_DEV,
    };

    try {
        const tokenResponse = await msalClient.acquireTokenByCode(tokenRequest);
        return tokenResponse;
    } catch (error) {
        console.error("Feil ved erverv av token:", error);
        throw error;
    }
} 