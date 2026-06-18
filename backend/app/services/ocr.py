import io
import logging
from typing import Optional
import PyPDF2
from app.services.gemini import gemini_service

logger = logging.getLogger("schemeconnect")

class OCRService:
    def extract_text_from_pdf_bytes(self, pdf_bytes: bytes) -> str:
        """
        Retrieves embedded text strings directly using standard PyPDF2 structures.
        """
        try:
            pdf_file = io.BytesIO(pdf_bytes)
            reader = PyPDF2.PdfReader(pdf_file)
            text_accumulator = []
            
            for page_num in range(len(reader.pages)):
                page = reader.pages[page_num]
                page_text = page.extract_text()
                if page_text:
                    text_accumulator.append(page_text)
            
            full_text = "\n".join(text_accumulator).strip()
            return full_text
        except Exception as e:
            logger.warning(f"PyPDF2 extractor failed on raw bytes: {str(e)}")
            return ""

    def multimodal_extract_text_fallback(self, file_bytes: bytes, file_mime: str = "application/pdf") -> str:
        """
        Smart visual OCR. If traditional extraction returns empty text, we employ Gemini's
        multimodal engine to read and transcribe scanned handwriting, photo images, or deeds.
        """
        logger.info(f"Triggering smart Multimodal OCR Fallback on mime {file_mime} ({len(file_bytes)} bytes)")
        try:
            # Setup multimodal binary object structure
            document_part = {
                "mime_type": file_mime,
                "data": file_bytes
            }
            
            prompt = """
            You are a high-fidelity civic Document OCR transcriber.
            Please read the attached scanned document or image page and transcribe all contents into clean, readable text.
            Maintain paragraph and section structure. Preserve numerical values, applicant names, survey IDs, and dates exactly.
            If the image is blurry, please make a best-effort transcription and label uncertain sections with [unclear].
            Do not write conversational intro or explanation. Just give the transcription.
            """
            
            # Using client.models.generate_content with structural bytes list
            response = gemini_service.client.models.generate_content(
                model="gemini-3.5-flash",
                contents=[document_part, prompt]
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"Multimodal Visual OCR fallback also failed: {str(e)}")
            return ""

    def extract_text_from_docx_bytes(self, docx_bytes: bytes) -> str:
        """
        Extracts paragraphs directly from a DOCX zip archive XML structure.
        No external python-docx dependencies required, bypassing OS/compilation incompatibilities.
        """
        import zipfile
        import xml.etree.ElementTree as ET
        try:
            f = io.BytesIO(docx_bytes)
            with zipfile.ZipFile(f) as z:
                xml_content = z.read("word/document.xml")
            root = ET.fromstring(xml_content)
            # Find all <w:p> paragraphs and extract text
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            paragraphs = []
            for p in root.findall('.//w:p', namespaces):
                texts = []
                for t in p.findall('.//w:t', namespaces):
                    if t.text:
                        texts.append(t.text)
                if texts:
                    paragraphs.append("".join(texts))
            full_text = "\n".join(paragraphs).strip()
            logger.info(f"Successfully processed DOCX text ({len(full_text)} chars)")
            return full_text
        except Exception as e:
            logger.error(f"Docx custom XML extraction failed: {str(e)}")
            return ""

    def process_document_extract(self, file_bytes: bytes, file_name: str) -> str:
        """
        Unified extraction gate:
        1. Try standard text extraction first (instant and free).
        2. If empty or tiny, fallback to smart multimodal OCR.
        """
        name_lower = file_name.lower()
        if name_lower.endswith(".pdf"):
            extracted = self.extract_text_from_pdf_bytes(file_bytes)
            if len(extracted) > 50:
                logger.info(f"Successfully processed searchable PDF text ({len(extracted)} chars)")
                return extracted
            else:
                # PDF is likely scanned
                return self.multimodal_extract_text_fallback(file_bytes, "application/pdf")
        elif name_lower.endswith(".docx"):
            return self.extract_text_from_docx_bytes(file_bytes)
        elif name_lower.endswith((".png", ".jpg", ".jpeg")):
            mime = "image/png" if name_lower.endswith(".png") else "image/jpeg"
            return self.multimodal_extract_text_fallback(file_bytes, mime)
        else:
            # Fallback direct string decoding for raw txt uploads
            try:
                return file_bytes.decode("utf-8")
            except Exception:
                raise ValueError("Unsupported upload extension type. Support limited to PDF, DOCX, PNG, JPEG, and TXT.")

# Singleton Service Instance
ocr_service = OCRService()
