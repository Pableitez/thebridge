// ===== AUTO-LOAD TEAM CONFIGURATIONS =====

// Función para cargar automáticamente configuraciones del equipo
async function autoLoadTeamConfigurations(teamId, userEmail) {
    console.log('🔄 Auto-loading team configurations:', { teamId, userEmail });
    
    try {
        // Ensure backendUrl is set
        if (!window.backendUrl) {
            if (typeof initializeBackendConfig === 'function') {
                initializeBackendConfig();
            } else {
                window.backendUrl = 'https://the-bridge-9g01.onrender.com';
            }
        }
        
        // First, get list of available configurations
        console.log('Fetching available configurations...');
        
        const listResponse = await fetch(`${window.backendUrl}/api/dashboard/list?teamId=${teamId}&userEmail=${userEmail}`);
        
        if (!listResponse.ok) {
            throw new Error('Failed to fetch configurations list');
        }
        
        const listResult = await listResponse.json();
        console.log('Available configurations:', listResult);
        
        if (!listResult.success) {
            throw new Error(listResult.error || 'Failed to get configurations list');
        }
        
        if (!listResult.files || listResult.files.length === 0) {
            console.log('No saved configurations found for this user/team');
            return { loaded: false, message: 'No saved configurations found' };
        }
        
        // Sort files by modification date (newest first)
        const sortedFiles = listResult.files.sort((a, b) => new Date(b.modified) - new Date(a.modified));
        
        // Load the most recent configuration
        const latestConfig = sortedFiles[0];
        console.log('Loading latest configuration:', latestConfig.filename);
        
        // Load the configuration
        const loadResponse = await fetch(`${window.backendUrl}/api/dashboard/load/${latestConfig.filename}?teamId=${teamId}&userEmail=${userEmail}`);
        
        if (!loadResponse.ok) {
            throw new Error('Failed to load configuration');
        }
        
        const loadResult = await loadResponse.json();
        
        if (!loadResult.success) {
            throw new Error(loadResult.error || 'Failed to load configuration');
        }
        
        console.log('✅ Configuration loaded successfully:', loadResult);
        
        // Apply the loaded configuration
        if (loadResult.configuration) {
            await applyDashboardConfiguration(loadResult.configuration);
            
            console.log('✅ Configuration applied successfully');
            return { loaded: true, message: 'Configuration loaded and applied' };
        } else {
            throw new Error('No configuration data in response');
        }
        
    } catch (error) {
        console.error('❌ Error auto-loading configurations:', error);
        throw error;
    }
}

// Función para aplicar configuración del dashboard (si no existe)
async function applyDashboardConfiguration(config) {
    console.log('🔄 Applying dashboard configuration...');
    
    try {
        // Aplicar configuración de equipos
        if (config.teams) {
            localStorage.setItem('thebridge_teams', JSON.stringify(config.teams));
            console.log('✅ Teams applied');
        }
        
        if (config.currentTeam) {
            localStorage.setItem('thebridge_current_team', JSON.stringify(config.currentTeam));
            console.log('✅ Current team applied');
        }
        
        // Aplicar configuración de filtros
        if (config.filters) {
            localStorage.setItem('thebridge_filters', JSON.stringify(config.filters));
            console.log('✅ Filters applied');
        }
        
        if (config.quickFilters) {
            localStorage.setItem('quickFilters', JSON.stringify(config.quickFilters));
            console.log('✅ Quick filters applied');
        }
        
        // Aplicar configuración de vistas de tabla
        if (config.tableViews) {
            localStorage.setItem('tableViews', JSON.stringify(config.tableViews));
            console.log('✅ Table views applied');
        }
        
        if (config.currentTableView) {
            localStorage.setItem('thebridge_current_table_view', config.currentTableView);
            console.log('✅ Current table view applied');
        }
        
        // Aplicar configuración de columnas
        if (config.columnConfig) {
            localStorage.setItem('thebridge_column_config', JSON.stringify(config.columnConfig));
            console.log('✅ Column config applied');
        }
        
        if (config.visibleColumns) {
            localStorage.setItem('thebridge_visible_columns', JSON.stringify(config.visibleColumns));
            console.log('✅ Visible columns applied');
        }
        
        if (config.columnOrder) {
            localStorage.setItem('thebridge_column_order', JSON.stringify(config.columnOrder));
            console.log('✅ Column order applied');
        }
        
        // Aplicar configuración de resúmenes personalizados
        if (config.customSummaries) {
            localStorage.setItem('customSummaries', JSON.stringify(config.customSummaries));
            console.log('✅ Custom summaries applied');
        }
        
        // Aplicar favoritos
        if (config.favorites) {
            localStorage.setItem('thebridge_favorites', JSON.stringify(config.favorites));
            console.log('✅ Favorites applied');
        }
        
        // Aplicar configuración de tema y idioma
        if (config.theme) {
            localStorage.setItem('thebridge_theme', config.theme);
            console.log('✅ Theme applied');
        }
        
        if (config.language) {
            localStorage.setItem('thebridge_language', config.language);
            console.log('✅ Language applied');
        }
        
        // Aplicar configuración de auto-save
        if (config.autoSave !== undefined) {
            window.autoSaveEnabled = config.autoSave;
            if (typeof window.toggleAutoSave === 'function') {
                window.toggleAutoSave(config.autoSave);
            }
            console.log('✅ Auto-save applied');
        }
        
        // Aplicar configuración de backend
        if (config.backendUrl) {
            window.backendUrl = config.backendUrl;
            console.log('✅ Backend URL applied');
        }
        
        // Recargar la página para aplicar todos los cambios
        console.log('🔄 Configuration applied, reloading page...');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error applying configuration:', error);
        throw error;
    }
}

// Make functions available globally
window.autoLoadTeamConfigurations = autoLoadTeamConfigurations;
window.applyDashboardConfiguration = applyDashboardConfiguration; 