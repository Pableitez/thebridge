export async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      // Verificar que el contenido no está vacío
      if (!content || content.trim().length === 0) {
        reject(new Error('The file is empty'));
        return;
      }
      
      // Verificar que hay al menos una línea
      const lines = content.split('\n');
      if (lines.length < 2) { // Al menos encabezado + 1 línea de datos
        reject(new Error('The file contains no data'));
        return;
      }

      console.log("📄 File read successfully:", {
        result: content.substring(0, 100) + "...", // Show first 100 chars
        length: content.length,
        lines: lines.length
      });
      resolve(content);
    };
    reader.onerror = (e) => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
}

export async function parseCSVFile(file) {
  try {
    console.log("🔄 Starting CSV parse for file:", file.name);
    const csvData = await readFileAsText(file);
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: false, // Cambiado a false para no perder líneas
        dynamicTyping: false, // Desactivado para mantener los tipos originales
        complete: (results) => {
          // Validar que tenemos datos
          if (!results.data || results.data.length === 0) {
            reject(new Error('No data found in CSV file'));
            return;
          }

          // Validar que tenemos encabezados
          if (!results.meta.fields || results.meta.fields.length === 0) {
            reject(new Error('No headers found in CSV file'));
            return;
          }

          // Validar la integridad de los datos
          const expectedFields = results.meta.fields.length;
          const invalidRows = results.data.filter(row => 
            Object.keys(row).length !== expectedFields
          );

          if (invalidRows.length > 0) {
            console.warn("⚠️ Found rows with missing fields:", {
              totalRows: results.data.length,
              invalidRows: invalidRows.length,
              firstInvalidRow: invalidRows[0]
            });
          }

          // Contar líneas vacías
          const emptyRows = results.data.filter(row => 
            Object.values(row).every(value => !value || value.toString().trim() === '')
          );

          if (emptyRows.length > 0) {
            console.warn("⚠️ Found empty rows:", {
              totalRows: results.data.length,
              emptyRows: emptyRows.length
            });
          }

          // Log detallado del resultado
          console.log("✅ CSV Parse complete:", {
            totalRows: results.data.length,
            fields: results.meta.fields,
            firstRow: results.data[0],
            lastRow: results.data[results.data.length - 1],
            errors: results.errors,
            invalidRows: invalidRows.length,
            emptyRows: emptyRows.length
          });

          // Verificar que no hemos perdido datos
          const originalLines = csvData.split('\n').length - 1; // -1 por el encabezado
          if (results.data.length < originalLines) {
            console.warn("⚠️ Possible data loss detected:", {
              originalLines,
              parsedRows: results.data.length,
              difference: originalLines - results.data.length
            });
          }

          // Eliminar la primera fila si es igual a los headers (header duplicado)
          const headers = results.meta.fields;
          if (results.data.length > 0 && headers.every(h => results.data[0][h] === h)) {
            results.data.shift();
          }
          // Eliminar filas vacías
          results.data = results.data.filter(row => !Object.values(row).every(value => !value || value.toString().trim() === ''));

          resolve(results);
        },
        error: (error) => {
          console.error("❌ CSV Parse error:", error);
          reject(error);
        },
        transform: (value) => {
          // Preservar espacios en blanco significativos
          if (typeof value === 'string') {
            // Solo trimear espacios al inicio y final, preservar espacios internos
            return value.trim();
          }
          return value;
        }
      });
    });
  } catch (error) {
    console.error("❌ Error processing CSV:", error);
    throw error;
  }
}

export function validateCSVFile(file) {
  try {
    if (!file) {
      return {
        isValid: false,
        error: "No file selected"
      };
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return {
        isValid: false,
        error: "Please select a CSV file"
      };
    }

    if (file.size === 0) {
      return {
        isValid: false,
        error: "The file is empty"
      };
    }

    // Verificar tamaño máximo (100MB)
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB en bytes
    if (file.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: "File size exceeds 100MB limit"
      };
    }

    console.log("✅ File validation passed:", {
      name: file.name,
      size: file.size,
      type: file.type
    });

    return {
      isValid: true,
      error: null
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message || "Error validating file"
    };
  }
} 

// Función para guardar CSV en carpeta local del usuario
export async function saveCSVToUserFolder(csvContent, suggestedFileName = 'data.csv') {
  try {
    console.log('💾 Intentando guardar CSV en carpeta local del usuario...');
    
    // Verificar si el navegador soporta File System Access API
    if ('showSaveFilePicker' in window) {
      return await saveCSVWithFileSystemAPI(csvContent, suggestedFileName);
    } else {
      // Fallback para navegadores que no soportan File System Access API
      return await saveCSVWithDownload(csvContent, suggestedFileName);
    }
  } catch (error) {
    console.error('❌ Error guardando CSV:', error);
    throw error;
  }
}

// Usar File System Access API (navegadores modernos)
async function saveCSVWithFileSystemAPI(csvContent, suggestedFileName) {
  try {
    console.log('🔧 Usando File System Access API...');
    
    // Crear el archivo con el contenido CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    
    // Mostrar diálogo para guardar archivo
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: suggestedFileName,
      types: [{
        description: 'CSV Files',
        accept: {
          'text/csv': ['.csv'],
        },
      }],
    });
    
    // Escribir el contenido al archivo
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    
    // Obtener información del directorio padre
    let folderPath = 'User selected folder';
    try {
      const parentHandle = await fileHandle.getParent();
      if (parentHandle) {
        folderPath = await getDirectoryPath(parentHandle);
      }
    } catch (pathError) {
      console.log('⚠️ No se pudo obtener la ruta del directorio:', pathError);
    }
    
    console.log('✅ CSV guardado exitosamente usando File System Access API');
    return {
      success: true,
      method: 'File System Access API',
      fileName: fileHandle.name,
      filePath: folderPath,
      fullPath: `${folderPath}/${fileHandle.name}`,
      message: 'File saved in selected folder'
    };
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('❌ Usuario canceló la operación de guardado');
      throw new Error('Operation cancelled by user');
    }
    throw error;
  }
}

// Función auxiliar para obtener la ruta del directorio
async function getDirectoryPath(dirHandle, maxDepth = 3) {
  try {
    const pathParts = [];
    let currentHandle = dirHandle;
    let depth = 0;
    
    while (currentHandle && depth < maxDepth) {
      pathParts.unshift(currentHandle.name);
      try {
        currentHandle = await currentHandle.getParent();
      } catch (e) {
        break; // No se puede obtener el padre
      }
      depth++;
    }
    
    return pathParts.join('/');
  } catch (error) {
    console.log('⚠️ Error obteniendo ruta del directorio:', error);
    return 'Selected folder';
  }
}

// Fallback para navegadores antiguos (descarga directa)
async function saveCSVWithDownload(csvContent, suggestedFileName) {
  try {
    console.log('🔧 Usando método de descarga (fallback)...');
    
    // Crear blob y descargar
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = suggestedFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpiar URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    console.log('✅ CSV descargado exitosamente');
    return {
      success: true,
      method: 'Download',
      fileName: suggestedFileName,
      filePath: 'Downloads folder',
      fullPath: `Downloads/${suggestedFileName}`,
      message: 'File downloaded to downloads folder'
    };
    
  } catch (error) {
    console.error('❌ Download error:', error);
    throw error;
  }
}

// Función para guardar versión de datos como CSV
export async function saveDataVersionAsCSV(data, versionName = 'data-version') {
  try {
    console.log('📊 Convirtiendo datos a CSV...');
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('No data to convert to CSV');
    }
    
    // Obtener headers del primer objeto
    const headers = Object.keys(data[0]);
    
    // Crear contenido CSV
    const csvRows = [
      headers.join(','), // Header row
      ...data.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // Escapar comillas y comas
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ];
    
    const csvContent = csvRows.join('\n');
    
    // Generar nombre de archivo
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${versionName}-${timestamp}.csv`;
    
    // Guardar archivo
    return await saveCSVToUserFolder(csvContent, fileName);
    
  } catch (error) {
    console.error('❌ Error guardando versión como CSV:', error);
    throw error;
  }
}

// Función para guardar datos filtrados como CSV
export async function saveFilteredDataAsCSV(data, filterDescription = 'filtered-data') {
  try {
    console.log('🔍 Guardando datos filtrados como CSV...');
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('No filtered data to save');
    }
    
    // Generar nombre descriptivo
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${filterDescription}-${timestamp}.csv`;
    
    return await saveDataVersionAsCSV(data, fileName);
    
  } catch (error) {
    console.error('❌ Error guardando datos filtrados:', error);
    throw error;
  }
}

// Función para guardar reporte personalizado como CSV
export async function saveCustomReportAsCSV(headers, rows, reportName = 'custom-report') {
  try {
    console.log('📋 Guardando reporte personalizado como CSV...');
    
    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      throw new Error('No hay headers para el reporte');
    }
    
    if (!rows || !Array.isArray(rows)) {
      throw new Error('No hay filas para el reporte');
    }
    
    // Crear contenido CSV
    const csvRows = [
      headers.join(','), // Header row
      ...rows.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ];
    
    const csvContent = csvRows.join('\n');
    
    // Generar nombre de archivo
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${reportName}-${timestamp}.csv`;
    
    // Guardar archivo
    return await saveCSVToUserFolder(csvContent, fileName);
    
  } catch (error) {
    console.error('❌ Error guardando reporte personalizado:', error);
    throw error;
  }
} 