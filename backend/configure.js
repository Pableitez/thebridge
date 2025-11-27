#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🌐 Configuración del Backend - The Bridge');
console.log('==========================================\n');

// Función para hacer preguntas
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Función para verificar si una carpeta existe
function checkFolderExists(folderPath) {
  try {
    return fs.existsSync(folderPath);
  } catch (error) {
    return false;
  }
}

// Función para crear carpeta si no existe
function createFolderIfNotExists(folderPath) {
  try {
    fs.ensureDirSync(folderPath);
    return true;
  } catch (error) {
    console.error(`❌ Error creando carpeta: ${folderPath}`);
    return false;
  }
}

async function configureBackend() {
  console.log('📁 Configuración de Carpetas de Sincronización\n');
  
  // Detectar carpetas disponibles
  const homeDir = os.homedir();
  const possibleFolders = {
    onedrive: path.join(homeDir, 'OneDrive'),
    googledrive: path.join(homeDir, 'Google Drive'),
    dropbox: path.join(homeDir, 'Dropbox'),
    documents: path.join(homeDir, 'Documents')
  };
  
  console.log('🔍 Detectando carpetas disponibles...\n');
  
  const availableFolders = {};
  for (const [name, folderPath] of Object.entries(possibleFolders)) {
    const exists = checkFolderExists(folderPath);
    availableFolders[name] = { path: folderPath, exists };
    console.log(`${exists ? '✅' : '❌'} ${name}: ${folderPath}`);
  }
  
  console.log('\n📋 Opciones de configuración:');
  console.log('1. OneDrive (recomendado para Windows)');
  console.log('2. Google Drive');
  console.log('3. Dropbox');
  console.log('4. Carpeta local (Documents)');
  console.log('5. Carpeta personalizada');
  
  const choice = await askQuestion('\nSelecciona una opción (1-5): ');
  
  let selectedPath = '';
  let providerName = '';
  
  switch (choice) {
    case '1':
      if (availableFolders.onedrive.exists) {
        selectedPath = path.join(availableFolders.onedrive.path, 'TheBridge', 'Versions');
        providerName = 'onedrive';
      } else {
        console.log('❌ OneDrive no está disponible en tu sistema');
        process.exit(1);
      }
      break;
      
    case '2':
      if (availableFolders.googledrive.exists) {
        selectedPath = path.join(availableFolders.googledrive.path, 'TheBridge', 'Versions');
        providerName = 'googledrive';
      } else {
        console.log('❌ Google Drive no está disponible en tu sistema');
        process.exit(1);
      }
      break;
      
    case '3':
      if (availableFolders.dropbox.exists) {
        selectedPath = path.join(availableFolders.dropbox.path, 'TheBridge', 'Versions');
        providerName = 'dropbox';
      } else {
        console.log('❌ Dropbox no está disponible en tu sistema');
        process.exit(1);
      }
      break;
      
    case '4':
      selectedPath = path.join(availableFolders.documents.path, 'TheBridge', 'Versions');
      providerName = 'local';
      break;
      
    case '5':
      const customPath = await askQuestion('Ingresa la ruta completa de la carpeta: ');
      selectedPath = path.join(customPath, 'TheBridge', 'Versions');
      providerName = 'custom';
      break;
      
    default:
      console.log('❌ Opción inválida');
      process.exit(1);
  }
  
  console.log(`\n📂 Carpeta seleccionada: ${selectedPath}`);
  
  // Crear la carpeta si no existe
  if (!checkFolderExists(selectedPath)) {
    console.log('\n🔨 Creando carpeta...');
    if (createFolderIfNotExists(selectedPath)) {
      console.log('✅ Carpeta creada exitosamente');
    } else {
      console.log('❌ No se pudo crear la carpeta');
      process.exit(1);
    }
  } else {
    console.log('✅ La carpeta ya existe');
  }
  
  // Actualizar el archivo de configuración
  console.log('\n⚙️ Actualizando configuración...');
  
  const configPath = path.join(__dirname, 'config', 'paths.js');
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Actualizar la ruta por defecto
  configContent = configContent.replace(
    /defaultProvider: ['"]\w+['"]/,
    `defaultProvider: '${providerName}'`
  );
  
  // Actualizar la ruta del proveedor seleccionado
  const providerPathRegex = new RegExp(`${providerName}: [^,]+`, 'g');
  configContent = configContent.replace(
    providerPathRegex,
    `${providerName}: '${selectedPath.replace(/\\/g, '\\\\')}'`
  );
  
  // Si es una carpeta personalizada, agregar al objeto providerPaths
  if (providerName === 'custom') {
    const providerPathsMatch = configContent.match(/providerPaths: \{[\s\S]*?\}/);
    if (providerPathsMatch) {
      const customEntry = `      custom: '${selectedPath.replace(/\\/g, '\\\\')}',\n`;
      configContent = configContent.replace(
        /providerPaths: \{/,
        `providerPaths: {\n${customEntry}`
      );
    }
  }
  
  fs.writeFileSync(configPath, configContent);
  console.log('✅ Configuración actualizada');
  
  // Crear archivo de información
  const infoPath = path.join(__dirname, 'config', 'setup-info.json');
  const setupInfo = {
    configuredAt: new Date().toISOString(),
    provider: providerName,
    folderPath: selectedPath,
    instructions: {
      webApp: '1. Abre index.html en tu navegador',
      backend: '2. Ejecuta: node server.js o start.bat/start.sh',
      connect: '3. Haz clic en "Connect to Backend" en la app'
    }
  };
  
  fs.writeFileSync(infoPath, JSON.stringify(setupInfo, null, 2));
  
  console.log('\n🎉 ¡Configuración completada!');
  console.log('\n📋 Próximos pasos:');
  console.log('1. Inicia el backend: node server.js');
  console.log('2. Abre la aplicación web (index.html)');
  console.log('3. Ve a "Data Versions" y haz clic en "Connect to Backend"');
  console.log(`4. Tus versiones se guardarán en: ${selectedPath}`);
  
  rl.close();
}

// Ejecutar configuración
configureBackend().catch(error => {
  console.error('❌ Error durante la configuración:', error);
  process.exit(1);
}); 