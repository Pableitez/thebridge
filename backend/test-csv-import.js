// Test file to check CSV module import
console.log('Testing CSV module import...');

try {
    const csvRouter = require('./routes/csv');
    console.log('✅ CSV module imported successfully');
    console.log('CSV router type:', typeof csvRouter);
} catch (error) {
    console.error('❌ Error importing CSV module:', error.message);
    console.error('Stack:', error.stack);
} 