import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-node';
import { shell } from 'electron';
import { msalConfig } from '../config/authConfig';

class AuthProvider {
    constructor() {
        this.clientApplication = new PublicClientApplication(msalConfig);
        this.cache = this.clientApplication.getTokenCache();
        this.account = null;
    }

    async login() {
        const authResponse = await this.getToken({
            scopes: ['User.Read', 'profile', 'openid'],
            prompt: 'select_account',
            extraQueryParameters: {
                domain_hint: 'bmf.no'
            }
        });

        return this.handleResponse(authResponse);
    }

    async logout() {
        if (!this.account) return;

        try {
            if (this.account.idTokenClaims?.login_hint) {
                await shell.openExternal(
                    `${msalConfig.auth.authority}/oauth2/v2.0/logout?logout_hint=${
                        encodeURIComponent(this.account.idTokenClaims.login_hint)
                    }`
                );
            }

            await this.cache.removeAccount(this.account);
            this.account = null;
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }

    async getToken(tokenRequest) {
        let authResponse;
        const account = this.account || await this.getAccount();

        if (account) {
            tokenRequest.account = account;
            authResponse = await this.getTokenSilent(tokenRequest);
        } else {
            authResponse = await this.getTokenInteractive(tokenRequest);
        }

        return authResponse;
    }

    async getTokenSilent(tokenRequest) {
        try {
            return await this.clientApplication.acquireTokenSilent(tokenRequest);
        } catch (error) {
            if (error instanceof InteractionRequiredAuthError) {
                console.log('Silent token acquisition failed, acquiring token interactive');
                return await this.getTokenInteractive(tokenRequest);
            }
            throw error;
        }
    }

    async getTokenInteractive(tokenRequest) {
        try {
            const openBrowser = async (url) => {
                await shell.openExternal(url);
            };

            return await this.clientApplication.acquireTokenInteractive({
                ...tokenRequest,
                openBrowser,
                successTemplate: '<h1>Innlogging vellykket!</h1> <p>Du kan nå lukke dette vinduet og gå tilbake til applikasjonen.</p>',
                errorTemplate: '<h1>Beklager, noe gikk galt</h1> <p>Gå tilbake til applikasjonen og sjekk konsollen for mer informasjon.</p>'
            });
        } catch (error) {
            console.error('Interactive token acquisition failed:', error);
            throw error;
        }
    }

    async handleResponse(response) {
        if (response !== null) {
            this.account = response.account;
        } else {
            this.account = await this.getAccount();
        }
        return this.account;
    }

    async getAccount() {
        const currentAccounts = await this.cache.getAllAccounts();

        if (!currentAccounts?.length) {
            console.log('Ingen kontoer funnet');
            return null;
        }

        if (currentAccounts.length > 1) {
            console.log('Flere kontoer funnet, bruker første konto');
            return currentAccounts[0];
        }

        return currentAccounts[0];
    }
}

export default new AuthProvider(); 