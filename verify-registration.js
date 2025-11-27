// ===== VERIFY USER REGISTRATION =====

console.log('🧪 Verificando registro de usuarios...');

// Verificar que el fix está cargado
if (typeof window.fixUserBackendSave === 'function') {
    console.log('✅ Fix cargado correctamente');
} else {
    console.log('❌ Fix no encontrado');
}

// Verificar configuración del backend
if (window.backendConfig) {
    console.log('✅ Configuración del backend encontrada');
    console.log('🌐 Backend URL:', window.backendConfig.getMainBackendUrl());
} else {
    console.log('❌ Configuración del backend no encontrada');
}

// Verificar funciones de registro
if (typeof window.registerUserWithBackend === 'function') {
    console.log('✅ Función de registro encontrada');
} else {
    console.log('❌ Función de registro no encontrada');
}

// Verificar función de guardado
if (typeof window.saveUserProfile === 'function') {
    console.log('✅ Función de guardado encontrada');
} else {
    console.log('❌ Función de guardado no encontrada');
}

// Test de registro simulado
async function testRegistration() {
    console.log('🧪 Probando registro simulado...');
    
    try {
        const testEmail = 'test-verify@example.com';
        const testPassword = 'test123456';
        const testName = 'Usuario Test';
        
        // Verificar si el usuario ya existe
        const existingUser = localStorage.getItem(`user_${testEmail}`);
        if (existingUser) {
            console.log('⚠️ Usuario de prueba ya existe, eliminando...');
            localStorage.removeItem(`user_${testEmail}`);
            
            // También eliminar del array de usuarios
            const users = JSON.parse(localStorage.getItem('thebridge_users') || '[]');
            const filteredUsers = users.filter(user => user.email !== testEmail);
            localStorage.setItem('thebridge_users', JSON.stringify(filteredUsers));
        }
        
        // Intentar registro
        if (typeof window.registerUserWithBackend === 'function') {
            console.log('🔄 Registrando usuario de prueba...');
            const success = await window.registerUserWithBackend(testEmail, testPassword, testName);
            
            if (success) {
                console.log('✅ Registro exitoso');
                
                // Verificar que se guardó localmente
                const savedUser = localStorage.getItem(`user_${testEmail}`);
                if (savedUser) {
                    console.log('✅ Usuario guardado localmente');
                    const userData = JSON.parse(savedUser);
                    console.log('📋 Datos del usuario:', userData);
                } else {
                    console.log('❌ Usuario no guardado localmente');
                }
                
                // Verificar en el array de usuarios
                const users = JSON.parse(localStorage.getItem('thebridge_users') || '[]');
                const foundUser = users.find(user => user.email === testEmail);
                if (foundUser) {
                    console.log('✅ Usuario encontrado en array local');
                } else {
                    console.log('❌ Usuario no encontrado en array local');
                }
                
                // Limpiar usuario de prueba
                console.log('🧹 Limpiando usuario de prueba...');
                localStorage.removeItem(`user_${testEmail}`);
                const cleanUsers = users.filter(user => user.email !== testEmail);
                localStorage.setItem('thebridge_users', JSON.stringify(cleanUsers));
                console.log('✅ Usuario de prueba eliminado');
                
            } else {
                console.log('❌ Registro falló');
            }
        } else {
            console.log('❌ Función de registro no disponible');
        }
        
    } catch (error) {
        console.error('❌ Error en test de registro:', error);
    }
}

// Ejecutar test después de un breve delay
setTimeout(testRegistration, 2000);

console.log('🔍 Verificación completada. Revisa la consola para más detalles.'); 