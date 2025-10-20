import { getMsalInstance, loginRequest } from './msalConfig.js';

// Bruk en mer pålitelig måte å sjekke miljøet
const isDev = window.electron?.env?.NODE_ENV === 'development';

// Enkel devlog funksjon for bedre debugging
const devlog = (message, data = null) => {
    if (isDev) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] AuthManager: ${message}`;
        if (data) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
    }
};

class AuthManager {
    constructor() {
        this.msalInstance = null;
        this.cachedUserDetails = null;
        devlog('AuthManager konstruert');
    }

    async initialize() {
        devlog('[Initialize] Starter...');
        this.cachedUserDetails = null; // Alltid nullstill ved init
        try {
            let msalAccountDetails = null;
            if (isDev) {
                devlog('[Initialize] Dev-modus: Henter MSAL-instans og kontoer...');
                this.msalInstance = await getMsalInstance();
                const accounts = this.msalInstance.getAllAccounts();
                if (accounts.length > 0) {
                    msalAccountDetails = accounts[0];
                    devlog('[Initialize] Dev: Fant eksisterende MSAL-konto', { username: msalAccountDetails?.username, name: msalAccountDetails?.name });
                } else {
                    devlog('[Initialize] Dev: Ingen eksisterende MSAL-kontoer funnet.');
                }
            } else {
                devlog('[Initialize] Prod-modus: Kaller window.electron.auth.getAccount()...');
                msalAccountDetails = await window.electron.auth.getAccount();
                if (msalAccountDetails) {
                    devlog('[Initialize] Prod: Fant eksisterende electron-konto', { username: msalAccountDetails?.username, name: msalAccountDetails?.name });
                } else {
                    devlog('[Initialize] Prod: Ingen eksisterende electron-konto funnet.');
                }
            }

            if (msalAccountDetails && msalAccountDetails.username) {
                devlog('[Initialize] MSAL/electron-konto funnet. Kaller getUserByEmail for:', msalAccountDetails.username);
                const userDetailsResult = await window.electron.userV2.getUserByEmail(msalAccountDetails.username);
                devlog('[Initialize] Resultat fra getUserByEmail:', userDetailsResult);

                if (userDetailsResult && userDetailsResult.success && userDetailsResult.data) {
                    this.cachedUserDetails = userDetailsResult.data;
                    this.cachedUserDetails.msalUsername = msalAccountDetails.username;
                    this.cachedUserDetails.msalName = msalAccountDetails.name;
                    devlog('[Initialize] UserV2 detaljer initialisert og cachet. Roller: ' + JSON.stringify(this.cachedUserDetails?.roller), this.cachedUserDetails);
                    return true;
                } else {
                    devlog('[Initialize] Kunne ikke hente/validere UserV2 detaljer for konto.', { email: msalAccountDetails.username, error: userDetailsResult?.error });
                    this.cachedUserDetails = null;
                    return false;
                }
            } else {
                devlog('[Initialize] Ingen gyldig MSAL/electron-konto å hente UserV2-detaljer for.');
                this.cachedUserDetails = null;
                return false;
            }
        } catch (error) {
            devlog('[Initialize] AuthManager initialisering feilet fundamentalt', { error: error.message, stack: error.stack });
            this.cachedUserDetails = null;
            return false;
        }
    }

    async login() {
        devlog('[Login] Starter login-prosess...');
        this.cachedUserDetails = null;
        try {
            let msalAuthResultAccount = null;
            if (isDev) {
                devlog('[Login] Dev-modus: Kaller MSAL loginPopup...');
                const authResult = await this.msalInstance.loginPopup(loginRequest);
                if (authResult && authResult.account) {
                    msalAuthResultAccount = authResult.account;
                    devlog('[Login] Dev: MSAL loginPopup vellykket', { username: msalAuthResultAccount?.username });
                } else {
                    devlog('[Login] Dev: MSAL loginPopup returnerte ikke konto.', authResult);
                }
            } else {
                devlog('[Login] Prod-modus: Kaller window.electron.auth.login()...');
                const response = await window.electron.auth.login();
                if (response && response.account) {
                    msalAuthResultAccount = response.account;
                    devlog('[Login] Prod: electron.auth.login vellykket', { username: msalAuthResultAccount?.username });
                } else {
                    devlog('[Login] Prod: electron.auth.login returnerte ikke konto.', response);
                }
            }

            if (msalAuthResultAccount && msalAuthResultAccount.username) {
                devlog('[Login] MSAL/electron login OK. Kaller getUserByEmail for:', msalAuthResultAccount.username);
                const userDetailsResult = await window.electron.userV2.getUserByEmail(msalAuthResultAccount.username);
                devlog('[Login] Resultat fra getUserByEmail:', userDetailsResult);

                if (userDetailsResult && userDetailsResult.success && userDetailsResult.data) {
                    this.cachedUserDetails = userDetailsResult.data;
                    this.cachedUserDetails.msalUsername = msalAuthResultAccount.username;
                    this.cachedUserDetails.msalName = msalAuthResultAccount.name;
                    devlog('[Login] Full login vellykket, UserV2 detaljer cachet', this.cachedUserDetails);
                    return true;
                } else {
                    devlog('[Login] Fant ikke/kunne ikke hente UserV2 detaljer etter MSAL/electron login.', {
                        email: msalAuthResultAccount.username,
                        error: userDetailsResult?.error,
                        success: userDetailsResult?.success,
                        data: userDetailsResult?.data
                    });
                    this.cachedUserDetails = null;
                    return false;
                }
            }
            devlog('[Login] MSAL/electron login-steg returnerte ikke gyldig konto.');
            this.cachedUserDetails = null;
            return false;
        } catch (error) {
            devlog('[Login] AuthManager login feilet fundamentalt', { error: error.message, stack: error.stack });
            this.cachedUserDetails = null;
            return false;
        }
    }

    async logout() {
        devlog('Starter logout-prosess');
        try {
            if (isDev) {
                if (this.msalInstance) {
                    const accountToLogout = this.cachedUserDetails?.msalUsername
                        ? this.msalInstance.getAccountByUsername(this.cachedUserDetails.msalUsername)
                        : (this.msalInstance.getAllAccounts()[0] || null);
                    if (accountToLogout) {
                        await this.msalInstance.logoutPopup({ account: accountToLogout });
                    }
                    devlog('Dev MSAL logout fullført');
                }
            } else {
                await window.electron.auth.logout();
                devlog('Prod electron.auth logout fullført');
            }
        } catch (error) {
            devlog('Logout feilet (MSAL/electron del)', { error: error.message });
        } finally {
            this.cachedUserDetails = null;
            devlog('cachedUserDetails nullstilt etter logout.');
        }
    }

    isAuthenticated() {
        const auth = !!this.cachedUserDetails && this.cachedUserDetails.is_active === true;
        devlog('Sjekker isAuthenticated', { isAuthenticated: auth, userEmail: this.cachedUserDetails?.email, isActive: this.cachedUserDetails?.is_active });
        return auth;
    }

    getCurrentUserDetails() {
        devlog('Henter cachedUserDetails. Roller: ' + JSON.stringify(this.cachedUserDetails?.roller), this.cachedUserDetails);
        return this.cachedUserDetails;
    }
}

export const authManager = new AuthManager();
export default authManager; 