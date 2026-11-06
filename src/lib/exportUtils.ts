import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  header: string;
  dataKey: string;
}

/**
 * Exporta una colección de datos a una hoja de cálculo Excel (.xlsx)
 */
export function exportToExcel(data: any[], filename: string, sheetName: string = 'Datos') {
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    alert('Ocurrió un error al generar el archivo Excel.');
  }
}

/**
 * Exporta una tabla con cabeceras formateadas y el Logotipo Oficial de FINTECH en la cabecera
 */
export function exportToPDF(
  columns: ExportColumn[],
  data: any[],
  title: string,
  filename: string,
  companyHeader: string = 'FINTECH — GESTIÓN DE CARTERA Y PRÉSTAMOS'
) {
  try {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // 1. Barra superior decorativa con degradado visual (Rojo #E5092F a Lila #8B5CF6)
    doc.setFillColor(229, 9, 47); // #E5092F
    doc.rect(0, 0, pageWidth / 2, 3, 'F');
    doc.setFillColor(139, 92, 246); // #8B5CF6
    doc.rect(pageWidth / 2, 0, pageWidth / 2, 3, 'F');

    // 2. ISOTIPO OFICIAL FINTECH (Caja cuadrada con bordes redondeados y glifo 'F')
    doc.setFillColor(20, 18, 31); // Fondo oscuro #14121F
    doc.roundedRect(14, 10, 18, 18, 4, 4, 'F');

    // Borde acento del isotipo
    doc.setDrawColor(229, 9, 47);
    doc.setLineWidth(0.6);
    doc.roundedRect(14, 10, 18, 18, 4, 4, 'S');

    // Letra 'F' estilizada en color rojo y lila
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(229, 9, 47);
    doc.text('F', 20.5, 22.5);

    // Pequeño acento lila dentro del glifo
    doc.setFillColor(139, 92, 246);
    doc.circle(27, 14, 1.5, 'F');

    // 3. TIPOGRAFÍA OFICIAL DE LA MARCA
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 15, 20); // Negro profundo
    doc.text('FIN', 36, 19);

    doc.setTextColor(229, 9, 47); // Rojo FINTECH
    doc.text('TECH', 48, 19);

    // Lema y descriptor institucional
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(113, 113, 122);
    doc.text('Tu negocio, en control · Plataforma Financiera & Préstamos', 36, 25);

    // 4. METADATOS Y BADGE DEL REPORTE (Alineado a la derecha)
    const rightMargin = pageWidth - 14;

    doc.setFillColor(244, 244, 248);
    doc.roundedRect(rightMargin - 65, 10, 65, 18, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(rightMargin - 65, 10, 65, 18, 3, 3, 'S');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(229, 9, 47);
    doc.text('REPORTE OFICIAL DEL SISTEMA', rightMargin - 61, 15);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, rightMargin - 61, 20);
    doc.text(`Hora: ${new Date().toLocaleTimeString('es-CO')}`, rightMargin - 61, 24);

    // 5. TÍTULO ESPECÍFICO DEL DOCUMENTO Y LÍNEA DIVISORIA
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(14, 32, pageWidth - 14, 32);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), 14, 39);

    // Formatear filas de datos
    const tableRows = data.map((item) => {
      return columns.map((col) => item[col.dataKey] ?? '');
    });

    // 6. GENERACIÓN DE TABLA ELEGANTE CON AUTOTABLE
    autoTable(doc, {
      startY: 43,
      head: [columns.map((c) => c.header)],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [20, 18, 31], // Negro / púrpura profundo #14121F
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (hookData) => {
        // Pie de página oficial en cada página
        const footerY = pageHeight - 8;
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);

        doc.text(
          'FINTECH · Software desarrollado por Fabián Andrés Martínez Valderrama — Documento administrativo confidencial.',
          14,
          footerY
        );

        const pageStr = `Página ${doc.internal.pages.length - 1}`;
        doc.text(pageStr, pageWidth - 14 - doc.getTextWidth(pageStr), footerY);
      },
    });

    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    alert('Ocurrió un error al generar el archivo PDF.');
  }
}
