export async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      // Verificar que el contenido no está vacío
      if (!content || content.trim().length === 0) {
        reject(new Error('El archivo está vacío'));
        return;
      }
      
      // Verificar que hay al menos una línea
      const lines = content.split('\n');
      if (lines.length < 2) { // Al menos encabezado + 1 línea de datos
        reject(new Error('El archivo no contiene datos'));
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
            reject(new Error('No se encontraron datos en el archivo CSV'));
            return;
          }

          // Validar que tenemos encabezados
          if (!results.meta.fields || results.meta.fields.length === 0) {
            reject(new Error('No se encontraron encabezados en el archivo CSV'));
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