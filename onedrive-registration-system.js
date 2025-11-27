// ===== ONEDRIVE REGISTRATION SYSTEM =====

// Sistema completo de registro con OneDrive y rutas personalizadas
class OneDriveRegistrationSystem {
    constructor() {
        this.isConfigured = false;
        this.registrationData = null;
        
        console.log('🔧 OneDrive Registration System initialized');
    }
    
    // 1. Iniciar proceso de registro con OneDrive
    async startRegistration(email, password, name) {
        try {
            console.log('🚀 Starting OneDrive registration process:', email);
            
            // Guardar datos de registro temporalmente
            this.registrationData = { email, password, name };
            
            // Mostrar modal de configuración de OneDrive
            if (window.showOneDriveConfiguration) {
                window.showOneDriveConfiguration((config) => {
                    this.onOneDriveConfigured(config);
                });
            } else {
                // Si no hay modal, usar configuración por defecto
                await this.onOneDriveConfigured({
                    basePath: 'TheBridge',
                    usersPath: 'users',
                    teamsPath: 'teams',
                    configurationsPath: 'configurations',
                    backupsPath: 'backups',
                    customPaths: {}
                });
            }
            
        } catch (error) {
            console.error('❌ Error starting registration:', error);
            throw error;
        }
    }
    
    // 2. Callback cuando OneDrive está configurado
    async onOneDriveConfigured(config) {
        try {
            console.log('✅ OneDrive configured, proceeding with registration');
            
            if (!this.registrationData) {
                throw new Error('No registration data available');
            }
            
            const { email, password, name } = this.registrationData;
            
            // 1. Guardar usuario localmente primero
            const userData = {
                id: email,
                email: email,
                password: password, // En producción, hashear
                name: name || email.split('@')[0],
                role: 'user',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                preferences: {
                    theme: 'dark',
                    language: 'es',
                    notifications: true
                },
                onedriveConfig: config
            };
            
            // Guardar en localStorage
            this.saveUserLocally(userData);
            
            // 2. Guardar en OneDrive con ruta personalizada
            const customPaths = window.getOneDriveCustomPaths ? window.getOneDriveCustomPaths() : {};
            const customUserPath = customPaths.user || null;
            
            if (window.saveUserToOneDriveCustom) {
                const savedToOneDrive = await window.saveUserToOneDriveCustom(userData, customUserPath);
                
                if (savedToOneDrive) {
                    console.log('✅ User saved to OneDrive successfully');
                } else {
                    console.warn('⚠️ Failed to save to OneDrive, but user registered locally');
                }
            }
            
            // 3. Crear equipo por defecto
            const defaultTeam = {
                id: `team-${email.split('@')[0]}`,
                name: `${name || email.split('@')[0]}'s Team`,
                description: 'Equipo por defecto',
                owner: email,
                members: [email],
                createdAt: new Date().toISOString(),
                settings: {
                    allowGuestAccess: true,
                    maxMembers: 10
                }
            };
            
            // Guardar equipo localmente
            this.saveTeamLocally(defaultTeam);
            
            // Guardar equipo en OneDrive
            const customTeamPath = customPaths.team || null;
            if (window.saveTeamToOneDriveCustom) {
                const savedTeamToOneDrive = await window.saveTeamToOneDriveCustom(defaultTeam, customTeamPath);
                
                if (savedTeamToOneDrive) {
                    console.log('✅ Team saved to OneDrive successfully');
                } else {
                    console.warn('⚠️ Failed to save team to OneDrive, but team created locally');
                }
            }
            
            // 4. Establecer usuario y equipo actual
            window.currentUser = userData;
            window.currentTeam = defaultTeam;
            
            localStorage.setItem('thebridge_current_user', JSON.stringify(userData));
            localStorage.setItem('thebridge_current_team', JSON.stringify(defaultTeam));
            localStorage.setItem('userEmail', email);
            
            // 5. Crear backup inicial
            if (window.createOneDriveBackupCustom) {
                await window.createOneDriveBackupCustom();
            }
            
            // 6. Mostrar botones de usuario
            if (typeof window.showLogoutBtn === 'function') {
                window.showLogoutBtn();
            }
            
            // 7. Mostrar notificación de éxito
            this.showSuccessMessage(email, config);
            
            console.log('✅ OneDrive registration completed successfully');
            
            return {
                success: true,
                message: 'Usuario registrado exitosamente con OneDrive',
                user: userData,
                team: defaultTeam,
                onedriveConfig: config
            };
            
        } catch (error) {
            console.error('❌ Error in OneDrive registration:', error);
            
            // Aún así, intentar guardar localmente
            if (this.registrationData) {
                const { email, password, name } = this.registrationData;
                const userData = {
                    id: email,
                    email: email,
                    password: password,
                    name: name || email.split('@')[0],
                    role: 'user',
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                };
                
                this.saveUserLocally(userData);
                window.currentUser = userData;
                localStorage.setItem('thebridge_current_user', JSON.stringify(userData));
                
                if (typeof window.showLogoutBtn === 'function') {
                    window.showLogoutBtn();
                }
            }
            
            throw error;
        }
    }
    
    // 3. Guardar usuario localmente
    saveUserLocally(userData) {
        try {
            // Guardar con clave específica
            localStorage.setItem(`user_${userData.email}`, JSON.stringify(userData));
            
            // Agregar a array de usuarios
            const users = JSON.parse(localStorage.getItem('thebridge_users') || '[]');
            const existingIndex = users.findIndex(u => u.email === userData.email);
            
            if (existingIndex !== -1) {
                users[existingIndex] = { ...users[existingIndex], ...userData };
            } else {
                users.push(userData);
            }
            
            localStorage.setItem('thebridge_users', JSON.stringify(users));
            
            console.log('✅ User saved locally');
            return true;
        } catch (error) {
            console.error('❌ Error saving user locally:', error);
            return false;
        }
    }
    
    // 4. Guardar equipo localmente
    saveTeamLocally(teamData) {
        try {
            // Guardar equipo específico
            localStorage.setItem(`team_${teamData.id}`, JSON.stringify(teamData));
            
            // Agregar a array de equipos
            const teams = JSON.parse(localStorage.getItem('thebridge_teams') || '[]');
            const existingIndex = teams.findIndex(t => t.id === teamData.id);
            
            if (existingIndex !== -1) {
                teams[existingIndex] = { ...teams[existingIndex], ...teamData };
            } else {
                teams.push(teamData);
            }
            
            localStorage.setItem('thebridge_teams', JSON.stringify(teams));
            
            console.log('✅ Team saved locally');
            return true;
        } catch (error) {
            console.error('❌ Error saving team locally:', error);
            return false;
        }
    }
    
    // 5. Mostrar mensaje de éxito
    showSuccessMessage(email, config) {
        const message = `
            ✅ Usuario registrado exitosamente!
            
            📧 Email: ${email}
            ☁️ OneDrive: Configurado
            📁 Carpeta Base: ${config.basePath}
            
            Tus datos se guardarán en:
            📂 ${config.basePath}/${config.usersPath}/ - Usuarios
            📂 ${config.basePath}/${config.teamsPath}/ - Equipos
            📂 ${config.basePath}/${config.configurationsPath}/ - Configuraciones
            📂 ${config.basePath}/${config.backupsPath}/ - Backups
            
            🔄 Sincronización automática activada
        `;
        
        if (typeof showNotification === 'function') {
            showNotification('✅ Usuario registrado exitosamente con OneDrive', 'success');
        } else {
            alert(message);
        }
    }
    
    // 6. Login con OneDrive
    async loginWithOneDrive(email, password) {
        try {
            console.log('🔐 Logging in with OneDrive:', email);
            
            // 1. Intentar cargar desde OneDrive primero
            let userData = null;
            const customPaths = window.getOneDriveCustomPaths ? window.getOneDriveCustomPaths() : {};
            const customUserPath = customPaths.user || null;
            
            if (window.loadUserFromOneDriveCustom) {
                userData = await window.loadUserFromOneDriveCustom(email, customUserPath);
            }
            
            // 2. Si no está en OneDrive, cargar desde local
            if (!userData) {
                userData = this.loadUserLocally(email);
            }
            
            if (!userData) {
                throw new Error('Usuario no encontrado');
            }
            
            // 3. Verificar contraseña
            if (userData.password !== password) {
                throw new Error('Contraseña incorrecta');
            }
            
            // 4. Actualizar último login
            userData.lastLogin = new Date().toISOString();
            
            // 5. Guardar actualización en ambos lugares
            this.saveUserLocally(userData);
            
            if (window.saveUserToOneDriveCustom) {
                await window.saveUserToOneDriveCustom(userData, customUserPath);
            }
            
            // 6. Cargar equipo del usuario
            const teamData = await this.loadUserTeam(userData);
            
            // 7. Establecer usuario y equipo actual
            window.currentUser = userData;
            window.currentTeam = teamData;
            
            localStorage.setItem('thebridge_current_user', JSON.stringify(userData));
            if (teamData) {
                localStorage.setItem('thebridge_current_team', JSON.stringify(teamData));
            }
            localStorage.setItem('userEmail', email);
            
            // 8. Mostrar botones de usuario
            if (typeof window.showLogoutBtn === 'function') {
                window.showLogoutBtn();
            }
            
            console.log('✅ OneDrive login successful');
            
            return {
                success: true,
                message: 'Login exitoso con OneDrive',
                user: userData,
                team: teamData
            };
            
        } catch (error) {
            console.error('❌ Error in OneDrive login:', error);
            throw error;
        }
    }
    
    // 7. Cargar usuario localmente
    loadUserLocally(email) {
        try {
            const userData = localStorage.getItem(`user_${email}`);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('❌ Error loading user locally:', error);
            return null;
        }
    }
    
    // 8. Cargar equipo del usuario
    async loadUserTeam(userData) {
        try {
            // Buscar equipo donde el usuario es miembro
            const teams = JSON.parse(localStorage.getItem('thebridge_teams') || '[]');
            let userTeam = teams.find(team => team.members && team.members.includes(userData.email));
            
            // Si no encuentra equipo, intentar cargar desde OneDrive
            if (!userTeam && window.loadTeamFromOneDriveCustom) {
                const customPaths = window.getOneDriveCustomPaths ? window.getOneDriveCustomPaths() : {};
                const customTeamPath = customPaths.team || null;
                
                // Intentar cargar equipo por defecto del usuario
                const defaultTeamId = `team-${userData.email.split('@')[0]}`;
                userTeam = await window.loadTeamFromOneDriveCustom(defaultTeamId, customTeamPath);
                
                if (userTeam) {
                    this.saveTeamLocally(userTeam);
                }
            }
            
            return userTeam;
        } catch (error) {
            console.error('❌ Error loading user team:', error);
            return null;
        }
    }
    
    // 9. Verificar si OneDrive está configurado
    isOneDriveConfigured() {
        try {
            const config = window.getOneDriveConfig ? window.getOneDriveConfig() : null;
            return config && config.basePath;
        } catch (error) {
            return false;
        }
    }
    
    // 10. Obtener información de configuración
    getConfigurationInfo() {
        try {
            const config = window.getOneDriveConfig ? window.getOneDriveConfig() : null;
            const customPaths = window.getOneDriveCustomPaths ? window.getOneDriveCustomPaths() : {};
            
            return {
                isConfigured: this.isOneDriveConfigured(),
                config: config,
                customPaths: customPaths,
                currentUser: window.currentUser,
                currentTeam: window.currentTeam
            };
        } catch (error) {
            console.error('❌ Error getting configuration info:', error);
            return {
                isConfigured: false,
                config: null,
                customPaths: {},
                currentUser: null,
                currentTeam: null
            };
        }
    }
    
    // 11. Sincronizar datos con OneDrive
    async syncWithOneDrive() {
        try {
            console.log('🔄 Syncing data with OneDrive...');
            
            if (!this.isOneDriveConfigured()) {
                throw new Error('OneDrive no está configurado');
            }
            
            // Sincronizar usuarios
            const users = JSON.parse(localStorage.getItem('thebridge_users') || '[]');
            const customPaths = window.getOneDriveCustomPaths ? window.getOneDriveCustomPaths() : {};
            const customUserPath = customPaths.user || null;
            
            for (const user of users) {
                if (window.saveUserToOneDriveCustom) {
                    await window.saveUserToOneDriveCustom(user, customUserPath);
                }
            }
            
            // Sincronizar equipos
            const teams = JSON.parse(localStorage.getItem('thebridge_teams') || '[]');
            const customTeamPath = customPaths.team || null;
            
            for (const team of teams) {
                if (window.saveTeamToOneDriveCustom) {
                    await window.saveTeamToOneDriveCustom(team, customTeamPath);
                }
            }
            
            // Crear backup
            if (window.createOneDriveBackupCustom) {
                await window.createOneDriveBackupCustom();
            }
            
            console.log('✅ Data synced with OneDrive successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Error syncing with OneDrive:', error);
            return false;
        }
    }
}

// Inicializar sistema de registro
window.oneDriveRegistration = new OneDriveRegistrationSystem();

// Override funciones existentes para usar OneDrive
window.registerUserWithOneDrive = async function(email, password, name) {
    return await window.oneDriveRegistration.startRegistration(email, password, name);
};

window.loginUserWithOneDrive = async function(email, password) {
    return await window.oneDriveRegistration.loginWithOneDrive(email, password);
};

window.syncDataWithOneDrive = async function() {
    return await window.oneDriveRegistration.syncWithOneDrive();
};

window.getOneDriveRegistrationInfo = function() {
    return window.oneDriveRegistration.getConfigurationInfo();
};

// Función para mostrar configuración de OneDrive desde el registro
window.showOneDriveSetup = function() {
    if (window.showOneDriveConfiguration) {
        window.showOneDriveConfiguration();
    } else {
        alert('OneDrive Configuration Modal no está disponible');
    }
};

console.log('🔧 OneDrive Registration System loaded and ready'); 