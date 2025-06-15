import { generateExcelReport, generatePDFReport, copyTableToClipboard } from '../../services/reportService.js';
import { showNotification } from '../notifications/NotificationManager.js';
import { openSummaryModal, setupSummaryModalEvents } from './CustomSummary.js';

export class ReportManager {
  constructor() {
    this.modal = document.getElementById('reportModal');
    this.options = document.querySelectorAll('.report-option');
    this.generateBtn = document.getElementById('confirmGenerateReportBtn');
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.options.forEach(option => {
      option.addEventListener('click', async () => {
        const type = option.dataset.type;
        if (type === 'copy') {
          const result = await copyTableToClipboard();
          showNotification(result.message, result.success ? 'success' : 'error');
          this.closeModal();
          if (this.generateBtn) this.generateBtn.disabled = true;
          return;
        } else {
          if (this.generateBtn) this.generateBtn.disabled = false;
        }
        try {
          let result;
          switch (type) {
            case 'excel':
              result = await generateExcelReport();
              break;
            case 'pdf':
              result = await generatePDFReport();
              break;
            default:
              throw new Error('Tipo de reporte no válido');
          }

          if (result.success) {
            showNotification(result.message, 'success');
            this.closeModal();
          } else {
            showNotification(result.message, 'error');
          }
        } catch (error) {
          console.error('Error al generar el reporte:', error);
          showNotification('Error al generar el reporte: ' + error.message, 'error');
        }
      });
    });
  }

  openModal() {
    this.modal.style.display = 'flex';
  }

  closeModal() {
    this.modal.style.display = 'none';
  }
}

// Exponer para uso global (ejemplo: window.openSummaryModal)
window.openSummaryModal = openSummaryModal;
setupSummaryModalEvents(); 