const { ipcMain } = require('electron');
const userServiceV2 = require('../services/userServiceV2.js');
const electronLog = require('electron-log');

function setupUserApiV2Handlers() {
    electronLog.info('Setter opp IPC-handlere for User API V2...');

    ipcMain.handle('userV2:getAllUsers', async (event) => {
        try {
            electronLog.info('IPC userV2:getAllUsers kalt');
            const users = await userServiceV2.getAllUsersV2();
            return { success: true, data: users };
        } catch (error) {
            electronLog.error('Feil i IPC handler [userV2:getAllUsers]:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('userV2:getAllRoles', async (event) => {
        try {
            electronLog.info('IPC userV2:getAllRoles kalt');
            const roles = await userServiceV2.getAllRolesV2();
            return { success: true, data: roles };
        } catch (error) {
            electronLog.error('Feil i IPC handler [userV2:getAllRoles]:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('userV2:getUserById', async (event, userId) => {
        try {
            electronLog.info(`IPC userV2:getUserById kalt for ID: ${userId}`);
            if (!userId) throw new Error('Bruker-ID er påkrevd.');
            const user = await userServiceV2.getUserV2ById(userId);
            return { success: true, data: user };
        } catch (error) {
            electronLog.error(`Feil i IPC handler [userV2:getUserById] for ID ${userId}:`, error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('userV2:createUser', async (event, params) => {
        // params: { userData: { email, navn, ... }, roleIds?: [...], modulIds?: [...], tilknyttetSelskapId?: "..." }
        try {
            const { userData, roleIds, modulIds, tilknyttetSelskapId } = params;
            if (!userData || !userData.email) throw new Error('userData med minst e-post er påkrevd.');

            electronLog.info('IPC userV2:createUser kalt med data:', params);
            const newUser = await userServiceV2.createUserV2(userData, roleIds, modulIds, tilknyttetSelskapId);
            return { success: true, data: newUser };
        } catch (error) {
            electronLog.error('Feil i IPC handler [userV2:createUser]:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('userV2:updateUser', async (event, params) => {
        // params: { userId, userData?: { ... }, roleIds?: [...], modulIds?: [...], tilknyttetSelskapId?: "..." (kan være null for å fjerne) }
        let userIdForLog = params?.userId || 'Ukjent ID'; // For sikker logging
        try {
            const { userId, userData, roleIds, modulIds, tilknyttetSelskapId } = params;
            userIdForLog = userId; // Oppdater hvis destrukturering lykkes

            if (!userId) throw new Error('userId er påkrevd for oppdatering.');
            if (!userData && roleIds === undefined && modulIds === undefined && tilknyttetSelskapId === undefined) {
                throw new Error('Minst ett felt (userData, roleIds, modulIds, tilknyttetSelskapId) må være definert for oppdatering.');
            }

            electronLog.info(`IPC userV2:updateUser kalt for ID: ${userId} med data:`, params);
            const updatedUser = await userServiceV2.updateUserV2(userId, userData, roleIds, modulIds, tilknyttetSelskapId);
            return { success: true, data: updatedUser };
        } catch (error) {
            // Bruk userIdForLog her, som er tryggere
            electronLog.error(`Feil i IPC handler [userV2:updateUser] for ID ${userIdForLog}:`, error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('userV2:getUserByEmail', async (event, email) => {
        try {
            electronLog.info(`IPC userV2:getUserByEmail kalt for e-post: ${email}`);
            if (!email) throw new Error('E-post er påkrevd.');
            const user = await userServiceV2.getUserByEmail(email);
            return { success: true, data: user };
        } catch (error) {
            electronLog.error(`Feil i IPC handler [userV2:getUserByEmail] for e-post ${email}:`, error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('userV2:getAllModules', async (event) => {
        try {
            electronLog.info('IPC userV2:getAllModules kalt');
            const moduler = await userServiceV2.getAllModules();
            return { success: true, data: moduler };
        } catch (error) {
            electronLog.error('Feil i IPC handler [userV2:getAllModules]:', error);
            return { success: false, error: error.message };
        }
    });

    // TODO: Legg til handler for deleteUser når/hvis det implementeres i servicen.

    electronLog.info('IPC-handlere for User API V2 er satt opp.');
}

module.exports = { setupUserApiV2Handlers }; 