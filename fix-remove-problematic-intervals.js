// ===== REMOVE PROBLEMATIC INTERVALS =====

// Función para eliminar setInterval problemáticos
function removeProblematicIntervals() {
    console.log('🔧 Removing problematic intervals...');
    
    // Clear all existing intervals
    const clearAllIntervals = () => {
        // Clear intervals with IDs up to 10000 (should cover all cases)
        for (let i = 1; i <= 10000; i++) {
            clearInterval(i);
        }
        console.log('🧹 Cleared all existing intervals');
    };
    
    // Clear intervals immediately
    clearAllIntervals();
    
    // Also clear after a delay to catch any new ones
    setTimeout(clearAllIntervals, 1000);
    setTimeout(clearAllIntervals, 3000);
    
    // Override setInterval to prevent problematic ones
    const originalSetInterval = window.setInterval;
    window.setInterval = function(callback, delay, ...args) {
        // Block intervals with very short delays that might cause loops
        if (delay < 1000) {
            console.warn('⚠️ Blocked setInterval with short delay:', delay, 'ms');
            return null;
        }
        
        // Allow intervals with longer delays
        return originalSetInterval.call(this, callback, delay, ...args);
    };
    
    console.log('✅ Problematic intervals removed and blocked');
}

// Initialize immediately
removeProblematicIntervals();

// Also initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', removeProblematicIntervals);

// Make function available globally
window.removeProblematicIntervals = removeProblematicIntervals; 