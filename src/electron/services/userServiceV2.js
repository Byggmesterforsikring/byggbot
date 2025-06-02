// const { PrismaClient } = require('@prisma/client'); // Gammel
const electronLog = require('electron-log');

const getPrismaInstance = require('../../../prisma/client.js'); // Korrekt sti
const prisma = getPrismaInstance();

electronLog.info(`<<<<< [userServiceV2] Toppnivå: typeof prisma: ${typeof prisma}, typeof prisma.Users: ${typeof prisma?.Users}, typeof prisma.RoleV2: ${typeof prisma?.RoleV2} >>>>>`);

class UserServiceV2 {
    async getAllUsersV2() {
        electronLog.info('UserServiceV2: Henter alle UserV2-brukere med roller');
        try {
            const users = await prisma.userV2.findMany({
                include: {
                    roller: { // Relasjonsfeltet fra UserV2 til UserRoleV2
                        include: {
                            role: true, // Inkluder RoleV2-data via UserRoleV2
                        },
                    },
                },
                orderBy: {
                    navn: 'asc',
                },
            });
            // Mapper om til en litt enklere struktur for frontend
            return users.map(user => ({
                ...user,
                roller: user.roller.map(userRole => userRole.role) // Returner en liste av RoleV2 objekter
            }));
        } catch (error) {
            electronLog.error('UserServiceV2: Feil ved henting av UserV2-brukere:', error);
            throw new Error(`Kunne ikke hente brukere: ${error.message}`);
        }
    }

    async getAllRolesV2() {
        electronLog.info('UserServiceV2: Henter alle RoleV2-roller');
        try {
            const roles = await prisma.roleV2.findMany({
                orderBy: {
                    role_name: 'asc',
                },
            });
            return roles;
        } catch (error) {
            electronLog.error('UserServiceV2: Feil ved henting av RoleV2-roller:', error);
            throw new Error(`Kunne ikke hente roller: ${error.message}`);
        }
    }

    async createUserV2(userData, roleIds = [], modulIds = [], tilknyttetSelskapId = null) {
        electronLog.info('UserServiceV2: Oppretter ny UserV2', { userData, roleIds, modulIds, tilknyttetSelskapId });
        try {
            return await prisma.$transaction(async (tx) => {
                const userCreateData = {
                    email: userData.email,
                    navn: userData.navn,
                    user_type: userData.user_type || 'INTERN',
                    is_active: userData.is_active !== undefined ? userData.is_active : true,
                    entra_id_object_id: userData.entra_id_object_id || null,
                };

                if (userCreateData.user_type === 'EKSTERN' && tilknyttetSelskapId) {
                    userCreateData.tilknyttetSelskapId = tilknyttetSelskapId;
                } else if (userCreateData.user_type === 'INTERN') {
                    userCreateData.tilknyttetSelskapId = null; // Sørg for at interne ikke har selskapstilknytning her
                }

                const newUser = await tx.userV2.create({
                    data: userCreateData
                });

                if (roleIds && roleIds.length > 0) {
                    const roleAssignments = roleIds.map(roleId => ({
                        user_id: newUser.id,
                        role_id: parseInt(roleId),
                    }));
                    await tx.userRoleV2.createMany({ data: roleAssignments, skipDuplicates: true });
                }

                if (modulIds && modulIds.length > 0) {
                    const modulAssignments = modulIds.map(modulId => ({
                        userId: newUser.id, // Merk: feltnavn i join-modellen
                        modulId: parseInt(modulId),
                    }));
                    await tx.userModulTilgang.createMany({ data: modulAssignments, skipDuplicates: true });
                }

                return tx.userV2.findUnique({
                    where: { id: newUser.id },
                    include: {
                        roller: { include: { role: true } },
                        modulTilganger: { include: { modul: true } },
                        tilknyttetSelskap: true
                    }
                });
            });
        } catch (error) {
            electronLog.error('UserServiceV2: Feil ved opprettelse av UserV2:', error);
            if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
                throw new Error(`En bruker med e-post '${userData.email}' finnes allerede.`);
            }
            if (error.code === 'P2003') {
                if (error.meta?.field_name?.includes('role_id')) {
                    throw new Error(`Kunne ikke opprette bruker: En eller flere av de angitte rolle-IDene er ugyldige.`);
                } else if (error.meta?.field_name?.includes('modulId')) {
                    throw new Error(`Kunne ikke opprette bruker: En eller flere av de angitte modul-IDene er ugyldige.`);
                } else if (error.meta?.field_name?.includes('tilknyttetSelskapId')) {
                    throw new Error(`Kunne ikke opprette bruker: Angitt selskap-ID for ekstern bruker er ugyldig.`);
                }
            }
            throw new Error(`Kunne ikke opprette bruker: ${error.message}`);
        }
    }

    async updateUserV2(userId, userData, roleIds, modulIds, tilknyttetSelskapId) {
        electronLog.info('UserServiceV2: Oppdaterer UserV2', { userId, userData, email: userData?.email, roles: roleIds, moduler: modulIds, selskap: tilknyttetSelskapId });
        const numUserId = parseInt(userId);
        if (isNaN(numUserId)) throw new Error('Ugyldig bruker-ID format.');

        try {
            return await prisma.$transaction(async (tx) => {
                const userUpdateData = {};
                if (userData.email !== undefined) userUpdateData.email = userData.email;
                if (userData.navn !== undefined) userUpdateData.navn = userData.navn;
                if (userData.user_type !== undefined) userUpdateData.user_type = userData.user_type;
                if (userData.is_active !== undefined) userUpdateData.is_active = userData.is_active;
                if (userData.entra_id_object_id !== undefined) {
                    userUpdateData.entra_id_object_id = userData.entra_id_object_id === '' ? null : userData.entra_id_object_id;
                }
                if (userUpdateData.user_type === 'EKSTERN') {
                    if (tilknyttetSelskapId !== undefined) {
                        userUpdateData.tilknyttetSelskapId = tilknyttetSelskapId;
                    }
                } else if (userUpdateData.user_type === 'INTERN') {
                    userUpdateData.tilknyttetSelskapId = null;
                }

                if (Object.keys(userUpdateData).length > 0) {
                    await tx.userV2.update({
                        where: { id: numUserId },
                        data: userUpdateData
                    });
                }

                if (roleIds !== undefined) {
                    await tx.userRoleV2.deleteMany({ where: { user_id: numUserId } });
                    if (roleIds.length > 0) {
                        const roleAssignments = roleIds.map(roleId => ({ user_id: numUserId, role_id: parseInt(roleId) }));
                        await tx.userRoleV2.createMany({ data: roleAssignments, skipDuplicates: true });
                    }
                }

                electronLog.info(`[updateUserV2] Mottatte modulIds for bruker ${numUserId}:`, modulIds);
                if (modulIds !== undefined) {
                    electronLog.info(`[updateUserV2] Sletter eksisterende modultilganger for bruker: ${numUserId}`);
                    const deleteResult = await tx.userModulTilgang.deleteMany({ where: { userId: numUserId } });
                    electronLog.info(`[updateUserV2] Resultat av deleteMany for moduler (bruker ${numUserId}):`, deleteResult);

                    if (modulIds.length > 0) {
                        const modulAssignments = modulIds.map(modulId => ({ userId: numUserId, modulId: parseInt(modulId) }));
                        electronLog.info(`[updateUserV2] Oppretter nye modultilganger for bruker ${numUserId}:`, modulAssignments);
                        const createResult = await tx.userModulTilgang.createMany({ data: modulAssignments, skipDuplicates: true });
                        electronLog.info(`[updateUserV2] Resultat av createMany for moduler (bruker ${numUserId}):`, createResult);
                    } else {
                        electronLog.info(`[updateUserV2] Ingen nye modultilganger å opprette for bruker ${numUserId} (modulIds var tom array).`);
                    }
                } else {
                    electronLog.info(`[updateUserV2] modulIds var undefined, ingen endring i modultilganger for bruker ${numUserId}.`);
                }

                return tx.userV2.findUnique({
                    where: { id: numUserId },
                    include: {
                        roller: { include: { role: true } },
                        modulTilganger: { include: { modul: true } },
                        tilknyttetSelskap: true
                    }
                });
            });
        } catch (error) {
            electronLog.error(`UserServiceV2: Feil ved oppdatering av UserV2 (ID: ${userId}):`, error);
            if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
                throw new Error(`En annen bruker finnes allerede med e-post '${userData.email}'.`);
            }
            if (error.code === 'P2002' && error.meta?.target?.includes('entra_id_object_id')) {
                throw new Error(`Entra ID Object ID '${userData.entra_id_object_id}' er allerede i bruk.`);
            }
            if (error.code === 'P2025') {
                throw new Error(`Bruker med ID ${userId} ble ikke funnet, eller en relatert ID (rolle, modul, selskap) er ugyldig.`);
            }
            if (error.code === 'P2003') {
                if (error.meta?.field_name?.includes('role_id')) {
                    throw new Error(`Kunne ikke oppdatere bruker: En eller flere av de angitte rolle-IDene er ugyldige.`);
                } else if (error.meta?.field_name?.includes('modulId')) {
                    throw new Error(`Kunne ikke oppdatere bruker: En eller flere av de angitte modul-IDene er ugyldige.`);
                } else if (error.meta?.field_name?.includes('tilknyttetSelskapId')) {
                    throw new Error(`Kunne ikke oppdatere bruker: Angitt selskap-ID for ekstern bruker er ugyldig.`);
                }
            }
            throw new Error(`Kunne ikke oppdatere bruker: ${error.message}`);
        }
    }

    async getUserV2ById(userId) {
        electronLog.info(`UserServiceV2: Henter UserV2 med ID: ${userId}`);
        const numUserId = parseInt(userId);
        if (isNaN(numUserId)) {
            throw new Error('Ugyldig bruker-ID format.');
        }
        try {
            const user = await prisma.userV2.findUnique({
                where: { id: numUserId },
                include: {
                    roller: { include: { role: true } },
                    modulTilganger: { include: { modul: true } },
                    tilknyttetSelskap: true
                }
            });
            if (!user) return null;

            return {
                ...user,
                roller: user.roller.map(userRole => userRole.role),
                modulTilganger: user.modulTilganger.map(userModul => userModul.modul),
            };
        } catch (error) {
            electronLog.error(`UserServiceV2: Feil ved henting av UserV2 (ID: ${userId}):`, error);
            throw new Error(`Kunne ikke hente bruker: ${error.message}`);
        }
    }

    async getUserByEmail(email) {
        electronLog.info(`UserServiceV2: Henter UserV2 med e-post: ${email}`);
        if (!email || typeof email !== 'string') {
            throw new Error('E-post er påkrevd og må være en streng.');
        }
        try {
            const user = await prisma.userV2.findUnique({
                where: { email: email.toLowerCase() }, // Søk case-insensitive på e-post hvis databasen støtter det, ellers normaliser her.
                include: {
                    roller: { include: { role: true } },
                    modulTilganger: { include: { modul: true } }
                }
            });
            if (!user) return null;

            // Mapper om til en litt enklere struktur for frontend
            return {
                ...user,
                roller: user.roller.map(userRole => userRole.role),
                modulTilganger: user.modulTilganger.map(userModul => userModul.modul)
            };
        } catch (error) {
            electronLog.error(`UserServiceV2: Feil ved henting av UserV2 (e-post: ${email}):`, error);
            throw new Error(`Kunne ikke hente bruker med e-post ${email}: ${error.message}`);
        }
    }

    async getAllModules() {
        electronLog.info('UserServiceV2: Henter alle Moduler');
        try {
            const moduler = await prisma.modul.findMany({
                orderBy: {
                    navn: 'asc',
                },
            });
            return moduler;
        } catch (error) {
            electronLog.error('UserServiceV2: Feil ved henting av Moduler:', error);
            throw new Error(`Kunne ikke hente moduler: ${error.message}`);
        }
    }

    // TODO: deleteUserV2(userId) (valgfritt)
}

module.exports = new UserServiceV2(); 