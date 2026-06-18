import React from 'react';
import { motion } from 'motion/react';
import { Download, Printer } from 'lucide-react';

interface LegalFlag {
  id?: string;
  flagId: string;
  severity: "critical" | "high" | "medium" | "low" | string;
  clauseType: string;
  title: string;
  description: string;
  risk: string;
  recommendation: string;
  pageNumber: number;
  originalText: string;
}

interface ExportReportProps {
  flags: LegalFlag[];
  fileName: string;
  riskScore: number;
  riskLevel: string;
}

export default function ExportReport({ flags, fileName, riskScore, riskLevel }: ExportReportProps) {
  
  const handlePrint = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colors matching an elite, authoritative legal document
      const slate900 = [15, 23, 42]; // Slate-900: #0f172a
      const slate600 = [71, 85, 105]; // Slate-600: #475569
      const slate400 = [148, 163, 184]; // Slate-400: #94a3b8
      const slate50 = [248, 250, 252]; // Slate-50: #f8fafc
      
      const red600 = [220, 38, 38]; // Critical / High severity
      const amber600 = [217, 119, 6]; // Medium severity
      const blue600 = [37, 99, 235]; // Low severity / Branding

      let y = 15;
      let pageNum = 1;

      // Header Brand
      const addPageDecoration = (pageNumNum: number) => {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(slate400[0], slate400[1], slate400[2]);
        doc.text(`Page ${pageNumNum}`, 210 / 2, 287, { align: 'center' });
        doc.text("SriNyaya Legal Diagnostics • Artificial Intelligence Contract Audit", 15, 287);
        
        if (pageNumNum > 1) {
          doc.setDrawColor(226, 232, 240); // Slate-200
          doc.setLineWidth(0.3);
          doc.line(15, 12, 195, 12);
          doc.text("SRINYAYA - LEGAL COMPLIANCE AUDIT", 15, 10);
        }
      };

      const performPageBreak = () => {
        addPageDecoration(pageNum);
        doc.addPage();
        pageNum++;
        y = 20;
      };

      const ensureSpace = (spaceNeeded: number) => {
        if (y + spaceNeeded > 265) {
          performPageBreak();
        }
      };

      // Top color accent bar (Blue branding)
      doc.setFillColor(blue600[0], blue600[1], blue600[2]);
      doc.rect(15, y, 180, 4, 'F');
      y += 10;

      // App Title & Brand
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(slate900[0], slate900[1], slate900[2]);
      doc.text("SriNyaya LegalAI", 15, y);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(slate600[0], slate600[1], slate600[2]);
      doc.text("Elite India Contract Auditor & Regulatory Compliance Diagnostics", 15, y + 5.5);

      // Current Date Badge
      const dateStr = new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.setFontSize(8);
      doc.setTextColor(slate400[0], slate400[1], slate400[2]);
      doc.text(`Audit Date: ${dateStr}`, 195, y, { align: 'right' });
      y += 12;

      // Divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15, y, 195, y);
      y += 8;

      // DOCUMENT COMPLIANCE MATRIX PANEL
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(blue600[0], blue600[1], blue600[2]);
      doc.text("DOCUMENT COMPLIANCE OVERVIEW", 15, y);
      y += 5;

      // Background card for overview details
      doc.setFillColor(slate50[0], slate50[1], slate50[2]);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, y, 180, 36, 3, 3, 'FD');

      doc.setFontSize(9.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(slate600[0], slate600[1], slate600[2]);

      const col1X = 20;
      const col2X = 110;

      // Row 1: File Name & Health score
      doc.text("Source Document:", col1X, y + 8);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(slate900[0], slate900[1], slate900[2]);
      doc.text(fileName || "Agreement.pdf", col1X + 35, y + 8);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(slate600[0], slate600[1], slate600[2]);
      doc.text("Document Health:", col2X, y + 8);
      doc.setFont('Helvetica', 'bold');
      // Healthy color: higher is better
      const isHealthy = riskScore >= 75;
      const scoreColor = isHealthy ? [22, 163, 74] : (riskScore >= 45 ? [217, 119, 6] : [220, 38, 38]);
      doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      doc.text(`${riskScore}/100 Index`, col2X + 35, y + 8);

      // Row 2: Regulatory Risk Profile
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(slate600[0], slate600[1], slate600[2]);
      doc.text("Risk Classification:", col1X, y + 16);
      doc.setFont('Helvetica', 'bold');
      const lvl = riskLevel || 'Low';
      const levelColor = lvl.toUpperCase() === 'CRITICAL' || lvl.toUpperCase() === 'HIGH' ? red600 : (lvl.toUpperCase() === 'MEDIUM' ? amber600 : [22, 163, 74]);
      doc.setTextColor(levelColor[0], levelColor[1], levelColor[2]);
      doc.text(`${lvl.toUpperCase()} RISK PROFILE`, col1X + 35, y + 16);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(slate600[0], slate600[1], slate600[2]);
      doc.text("Total Flagged Risks:", col2X, y + 16);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(slate900[0], slate900[1], slate900[2]);
      doc.text(`${flags.length} Concerns Found`, col2X + 35, y + 16);

      // Row 3: Security & Verification info
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(slate600[0], slate600[1], slate600[2]);
      doc.text("AI Audit Confidence:", col1X, y + 24);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(22, 163, 74);
      doc.text(">= 95% STRICT CONFIDENCE", col1X + 35, y + 24);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(slate600[0], slate600[1], slate600[2]);
      doc.text("Indian Jurisdictions:", col2X, y + 24);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(slate900[0], slate900[1], slate900[2]);
      doc.text("Central & State Laws AP/TS", col2X + 35, y + 24);

      y += 44;

      // Section title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(slate900[0], slate900[1], slate900[2]);
      doc.text(`EXPLICIT CONTRACT RISK COVENANTS DIRECTORY`, 15, y);
      y += 6;

      if (flags.length === 0) {
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(22, 163, 74);
        doc.text("No regulatory legal risks exceeding the 95% confidence threshold were flagged in this document.", 15, y);
      } else {
        // Render each flag
        flags.forEach((flag, index) => {
          // Estimate height of this container
          const verbatimText = flag.originalText || '';
          const wrapVerbatim = doc.splitTextToSize(verbatimText ? `Verbatim: "${verbatimText}"` : 'Reference text not found.', 168);
          
          const titleText = flag.title || 'Contractual Risk';
          
          const descText = flag.description || '';
          const wrapDesc = doc.splitTextToSize(descText, 168);

          const recomText = flag.recommendation || '';
          const wrapRecom = doc.splitTextToSize(`Proposed Revision: ${recomText}`, 168);

          // Card height depends on text wraps
          const textLinesCount = wrapVerbatim.length + wrapDesc.length + wrapRecom.length;
          const containerHeight = 22 + (textLinesCount * 5) + 6;

          ensureSpace(containerHeight);

          // Card Background
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.4);
          doc.roundedRect(15, y, 180, containerHeight - 4, 1.5, 1.5, 'FD');

          // Colored severity tab in the top-left of the flag card
          const severity = (flag.severity || 'medium').toLowerCase();
          const sevColor = severity === 'critical' || severity === 'high' ? red600 : (severity === 'medium' ? amber600 : blue600);
          doc.setFillColor(sevColor[0], sevColor[1], sevColor[2]);
          doc.rect(15.2, y + 0.2, 4, 6.5, 'F');

          // Flag ID & Severity Label
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(sevColor[0], sevColor[1], sevColor[2]);
          doc.text(`CONCERN #${index + 1} • [${severity.toUpperCase()} SEVERITY]`, 21, y + 5);

          // Page Number
          doc.setFont('Helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(slate400[0], slate400[1], slate400[2]);
          doc.text(`Clause Page Ref: ${flag.pageNumber || 1}`, 190, y + 5, { align: 'right' });

          y += 9;

          // Flag Title
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(10.5);
          doc.setTextColor(slate900[0], slate900[1], slate900[2]);
          doc.text(titleText, 20, y);
          y += 5.5;

          // Description
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(slate600[0], slate600[1], slate600[2]);
          wrapDesc.forEach((line: string) => {
            doc.text(line, 20, y);
            y += 4.8;
          });
          y += 1.5;

          // Verbatim text box
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(18, y - 3.5, 174, (wrapVerbatim.length * 4.4) + 3, 1, 1, 'F');
          
          doc.setFont('Helvetica', 'oblique');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          wrapVerbatim.forEach((line: string) => {
            doc.text(line, 21, y);
            y += 4.4;
          });
          y += 3;

          // Recommendation text
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(37, 99, 235);
          wrapRecom.forEach((line: string) => {
            doc.text(line, 20, y);
            y += 4.8;
          });

          y += 6; // margin relative to the next flag
        });
      }

      // Legal disclaimer footer
      ensureSpace(20);
      y += 4;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(slate400[0], slate400[1], slate400[2]);
      doc.text("LIMIT OF LIABILITY DISCLAIMER: This document serves solely as dynamic educational contract diagnostic guidance using Indian jurisprudence filters.", 15, y);
      doc.text("SriNyaya AI diagnostics do not substitute formal advocates' opinions or counsel certifications under the Advocates Act, 1961.", 15, y + 3.5);

      // Save PDF!
      addPageDecoration(pageNum);
      const cleanedFileName = fileName.replace(/\.[^/.]+$/, "");
      const outputName = `SriNyaya_ContractAudit_${cleanedFileName}.pdf`;
      doc.save(outputName);
    } catch (err: any) {
      console.error("Error generating contract PDF:", err);
    }
  };

  const handleDownloadCSV = () => {
    if (!flags || flags.length === 0) return;

    // CSV Headers
    const headers = ['Flag ID', 'Severity', 'Section/Clause Type', 'Risk Title', 'Risk Description', 'Potential Financial Harm', 'Recommended Wording', 'Page'];
    
    // Convert flags to CSV rows
    const rows = flags.map((f) => [
      f.flagId,
      f.severity.toUpperCase(),
      f.clauseType,
      `"${f.title.replace(/"/g, '""')}"`,
      `"${f.description.replace(/"/g, '""')}"`,
      `"${(f.risk || '').replace(/"/g, '""')}"`,
      `"${f.recommendation.replace(/"/g, '""')}"`,
      f.pageNumber
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    
    // Create Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SriNyaya_AuditReport_${fileName.replace(/\.[^/.]+$/, "")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap gap-2" id="export-controls-row">
      {/* CSV Exporter */}
      <button
        onClick={handleDownloadCSV}
        className="px-3.5 py-2 bg-bg-base hover:bg-bg-elevated border border-border-main text-text-secondary hover:text-text-primary rounded-lg text-xs font-heading font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5"
        id="btn-export-csv"
      >
        <Download size={13} className="text-success" />
        <span>Export CSV</span>
      </button>

      {/* Print styled view trigger */}
      <button
        onClick={handlePrint}
        className="px-3.5 py-2 bg-accent text-white hover:opacity-90 rounded-lg text-xs font-heading font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5"
        id="btn-print-pdf"
      >
        <Printer size={13} />
        <span>Print PDF</span>
      </button>
    </div>
  );
}
