/**
 * PDF Metadata Extraction Utility
 * 
 * Extracts key information from PDF itineraries:
 * - Tour title
 * - Duration
 * - Highlights/key points
 * - Schedule information
 */

interface PDFMetadata {
  title?: string;
  duration?: string;
  highlights?: string[];
  extractedText?: string;
}

/**
 * Extract metadata from PDF file
 * Uses heuristics to identify tour information from text content
 */
export async function extractPDFMetadata(file: File): Promise<PDFMetadata> {
  try {
    // For production, we'll use a simple text extraction approach
    // In a full implementation, you'd use a library like pdf.js or pdfjs-dist
    
    // This is a placeholder that extracts filename-based metadata
    const filename = file.name.replace('.pdf', '');
    
    // Parse filename for hints (e.g., "3-Day-Gorilla-Trek.pdf")
    const durationMatch = filename.match(/(\d+)[\s-]*(day|days|night|nights)/i);
    const duration = durationMatch ? durationMatch[0] : undefined;
    
    // Clean filename to create a suggested title
    const title = filename
      .replace(/[-_]/g, ' ')
      .replace(/\d+[\s-]*(day|days|night|nights)/gi, '')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    return {
      title: title || undefined,
      duration: duration || undefined,
      highlights: [],
      extractedText: `PDF uploaded: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    return {
      extractedText: 'Unable to extract PDF metadata'
    };
  }
}

/**
 * Validate PDF file
 */
export function validatePDF(file: File): { valid: boolean; error?: string } {
  if (!file.type.includes('pdf')) {
    return { valid: false, error: 'File must be a PDF' };
  }
  
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'PDF must be smaller than 10MB' };
  }
  
  return { valid: true };
}
