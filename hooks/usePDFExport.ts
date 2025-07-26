import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { AgentRequest, AgentStep } from '@/lib/types';

interface UsePDFExportOptions {
  filename?: string;
  scale?: number;
  quality?: number;
}

interface UsePDFExportReturn {
  exportToPDF: (
    element: HTMLElement,
    request: AgentRequest,
    filteredSteps: AgentStep[]
  ) => Promise<void>;
  isExporting: boolean;
  error: string | null;
}

export function usePDFExport(options: UsePDFExportOptions = {}): UsePDFExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    filename = 'agent-flow-export.pdf',
    scale = 2,
    quality = 0.95
  } = options;

  const exportToPDF = useCallback(async (
    element: HTMLElement,
    request: AgentRequest,
    filteredSteps: AgentStep[]
  ) => {
    if (!element || !request) {
      setError('Invalid element or request data');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      // Create a new PDF document
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);

      // Add cover page with summary information
      await addCoverPage(pdf, request, filteredSteps, pageWidth, pageHeight, margin);

      // Capture the flow content with html2canvas-pro (supports OKLCH colors)
      const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        removeContainer: true,
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          // Ensure consistent styling in the cloned document
          const clonedElement = clonedDoc.querySelector('[data-export-content]');
          if (clonedElement) {
            (clonedElement as HTMLElement).style.width = '1200px';
            (clonedElement as HTMLElement).style.maxWidth = 'none';
          }
        }
      });

      // Calculate dimensions for the PDF
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add new page for content
      pdf.addPage();

      // Add content header
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Agent Flow Steps', margin, margin + 10);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Showing ${filteredSteps.length} steps`, margin, margin + 20);

      // Add the captured content
      const imgData = canvas.toDataURL('image/jpeg', quality);
      
      let yPosition = margin + 30;
      const availableHeight = pageHeight - yPosition - margin;

      if (imgHeight <= availableHeight) {
        // Content fits on one page
        pdf.addImage(imgData, 'JPEG', margin, yPosition, imgWidth, imgHeight);
      } else {
        // Content needs multiple pages
        const pageCount = Math.ceil(imgHeight / availableHeight);
        
        for (let i = 0; i < pageCount; i++) {
          if (i > 0) {
            pdf.addPage();
            yPosition = margin;
          }

          const sourceY = i * (canvas.height / pageCount);
          const sourceHeight = canvas.height / pageCount;
          
          // Create a new canvas for this page section
          const pageCanvas = document.createElement('canvas');
          const pageCtx = pageCanvas.getContext('2d');
          
          if (pageCtx) {
            pageCanvas.width = canvas.width;
            pageCanvas.height = sourceHeight;
            
            pageCtx.drawImage(
              canvas,
              0, sourceY, canvas.width, sourceHeight,
              0, 0, canvas.width, sourceHeight
            );
            
            const pageImgData = pageCanvas.toDataURL('image/jpeg', quality);
            const pageImgHeight = (sourceHeight * imgWidth) / canvas.width;
            
            pdf.addImage(pageImgData, 'JPEG', margin, yPosition, imgWidth, pageImgHeight);
          }
        }
      }

      // Add footer with timestamp
      const timestamp = new Date().toLocaleString();
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      
      const totalPages = pdf.internal.pages.length - 1; // Subtract 1 for the blank first page
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.text(`Generated on ${timestamp}`, margin, pageHeight - 10);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
      }

      // Generate filename with timestamp
      const timestamp_filename = filename.replace('.pdf', `-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`);
      
      // Save the PDF
      pdf.save(timestamp_filename);

    } catch (err) {
      console.error('PDF export error:', err);
      
      // Provide more specific error messages for common issues
      let errorMessage = 'Failed to export PDF';
      if (err instanceof Error) {
        if (err.message.includes('oklch') || err.message.includes('color function')) {
          errorMessage = 'Color parsing error. Please try again or contact support.';
        } else if (err.message.includes('canvas')) {
          errorMessage = 'Canvas rendering failed. Try reducing the content size.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsExporting(false);
    }
  }, [filename, scale, quality]);

  return {
    exportToPDF,
    isExporting,
    error
  };
}

async function addCoverPage(
  pdf: jsPDF,
  request: AgentRequest,
  filteredSteps: AgentStep[],
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  const centerX = pageWidth / 2;
  let yPosition = margin + 20;

  // Title
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Agent Flow Report', centerX, yPosition, { align: 'center' });

  yPosition += 20;

  // Request Information
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Request Information', margin, yPosition);

  yPosition += 10;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');

  const requestInfo = [
    `Request ID: ${request.request_id || request.id}`,
    `User ID: ${request.user_id || 'Unknown'}`,
    `Start Time: ${new Date(request.start_time).toLocaleString()}`,
    `End Time: ${request.end_time ? new Date(request.end_time).toLocaleString() : 'Ongoing'}`,
    `Total Steps: ${filteredSteps.length}`,
    `Agents Involved: ${request.summary.agents_involved.join(', ')}`,
    `Tools Used: ${request.summary.tools_used.join(', ')}`,
    `Errors: ${request.summary.errors}`
  ];

  for (const info of requestInfo) {
    pdf.text(info, margin, yPosition);
    yPosition += 8;
  }

  yPosition += 10;

  // Summary Statistics
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Summary Statistics', margin, yPosition);

  yPosition += 10;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');

  const stepTypes = filteredSteps.reduce((acc, step) => {
    acc[step.type] = (acc[step.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stepTypeLabels = {
    'initial_request': 'Initial Requests',
    'system_prompt': 'System Prompts',
    'tool_execution': 'Tool Executions',
    'resource_retrieval': 'Resource Retrievals',
    'agent_response': 'Agent Responses',
    'error': 'Errors'
  };

  for (const [type, count] of Object.entries(stepTypes)) {
    const label = stepTypeLabels[type as keyof typeof stepTypeLabels] || type;
    pdf.text(`${label}: ${count}`, margin, yPosition);
    yPosition += 8;
  }

  // Add generation timestamp
  yPosition = pageHeight - 30;
  pdf.setFontSize(10);
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Generated on: ${new Date().toLocaleString()}`, centerX, yPosition, { align: 'center' });
}