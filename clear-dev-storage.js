// Script para limpiar almacenamiento en desarrollo
console.log('🧹 Limpiando almacenamiento de desarrollo...');

// Limpiar localStorage
try {
    localStorage.clear();
    console.log('✅ localStorage limpiado');
} catch (error) {
    console.error('❌ Error limpiando localStorage:', error);
}

// Limpiar sessionStorage
try {
    sessionStorage.clear();
    console.log('✅ sessionStorage limpiado');
} catch (error) {
    console.error('❌ Error limpiando sessionStorage:', error);
}

// Limpiar cookies
try {
    document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    console.log('✅ Cookies limpiadas');
} catch (error) {
    console.error('❌ Error limpiando cookies:', error);
}

// Limpiar IndexedDB
if (window.indexedDB) {
    try {
        const deleteRequest = indexedDB.deleteDatabase('TheBridgeDB');
        deleteRequest.onsuccess = function() {
                          console.log('✅ IndexedDB deleted');
            console.log('🔄 Reload the page to complete the cleanup');
        };
        deleteRequest.onerror = function(event) {
            console.error('❌ Error eliminando IndexedDB:', event.target.error);
        };
    } catch (error) {
        console.error('❌ Error limpiando IndexedDB:', error);
    }
} else {
    console.log('⚠️ IndexedDB no disponible');
}

    console.log('🎯 Cleanup completed. Reload the page.'); 