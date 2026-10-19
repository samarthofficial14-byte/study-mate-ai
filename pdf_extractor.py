"""
PDF Text Extraction Module
Extracts, cleans, and structures text from uploaded PDF study documents.
"""

import io
from typing import Tuple, Dict, Any
from pypdf import PdfReader


def extract_text_from_pdf(file_stream_or_path, max_pages: int = 50) -> Dict[str, Any]:
    """
    Extracts text from a PDF file stream or filepath.
    
    Returns:
        dict: {
            "success": bool,
            "text": str,
            "page_count": int,
            "char_count": int,
            "word_count": int,
            "error": str or None
        }
    """
    try:
        reader = PdfReader(file_stream_or_path)
        total_pages = len(reader.pages)
        
        if total_pages == 0:
            return {
                "success": False,
                "text": "",
                "page_count": 0,
                "char_count": 0,
                "word_count": 0,
                "error": "The uploaded PDF has no readable pages."
            }
            
        extracted_pages = []
        pages_to_read = min(total_pages, max_pages)
        
        for idx in range(pages_to_read):
            page = reader.pages[idx]
            page_text = page.extract_text() or ""
            if page_text.strip():
                extracted_pages.append(f"--- Page {idx + 1} ---\n{page_text.strip()}")
                
        full_text = "\n\n".join(extracted_pages).strip()
        
        if not full_text:
            return {
                "success": False,
                "text": "",
                "page_count": total_pages,
                "char_count": 0,
                "word_count": 0,
                "error": "No selectable text found in the PDF. It might be a scanned image-only PDF."
            }
            
        words = full_text.split()
        return {
            "success": True,
            "text": full_text,
            "page_count": total_pages,
            "pages_read": pages_to_read,
            "char_count": len(full_text),
            "word_count": len(words),
            "error": None
        }
        
    except Exception as e:
        return {
            "success": False,
            "text": "",
            "page_count": 0,
            "char_count": 0,
            "word_count": 0,
            "error": f"Failed to parse PDF: {str(e)}"
        }

