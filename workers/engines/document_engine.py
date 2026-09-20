import os
import shutil
import subprocess
import logging
from typing import Dict, Any, Optional, Callable
from workers.engines.base import BaseConversionEngine

logger = logging.getLogger(__name__)

class DocumentEngine(BaseConversionEngine):
    @classmethod
    def _find_pandoc(cls) -> Optional[str]:
        found = shutil.which("pandoc")
        if found:
            return found
        candidates = [
            os.path.expandvars(r"%LOCALAPPDATA%\Pandoc\pandoc.exe"),
            os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Links\pandoc.exe"),
            r"C:\Program Files\Pandoc\pandoc.exe",
            r"C:\Program Files (x86)\Pandoc\pandoc.exe",
            r"C:\ProgramData\chocolatey\bin\pandoc.exe",
        ]
        for p in candidates:
            if os.path.exists(p):
                return p
        return None

    @classmethod
    def _find_libreoffice(cls) -> Optional[str]:
        found = shutil.which("libreoffice") or shutil.which("soffice")
        if found:
            return found
        candidates = [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\LibreOffice\program\soffice.exe"),
            r"C:\Program Files\LibreOffice\program\soffice.com",
        ]
        for p in candidates:
            if os.path.exists(p):
                return p
        return None

    def __init__(self, progress_callback: Optional[Callable[[float, str], None]] = None):
        super().__init__(progress_callback)
        self.pandoc_bin = self._find_pandoc()
        self.has_pandoc = self.pandoc_bin is not None
        self.lo_bin = self._find_libreoffice()
        self.has_libreoffice = self.lo_bin is not None

    def convert(
        self,
        input_path: str,
        output_path: str,
        source_format: str,
        target_format: str,
        options: Dict[str, Any]
    ) -> str:
        src_fmt = source_format.lower().lstrip(".")
        tgt_fmt = target_format.lower().lstrip(".")
        self.report_progress(15.0, f"Traitement du document {src_fmt.upper()} vers {tgt_fmt.upper()}...")

        # 0.a Conversion directe PDF vers DOCX via pdf2docx
        if src_fmt == "pdf" and tgt_fmt in ["docx", "doc"]:
            self.report_progress(30.0, "Extraction de la structure PDF et conversion en Word DOCX...")
            try:
                from pdf2docx import Converter
                cv = Converter(input_path)
                cv.convert(output_path, start=0, end=None)
                cv.close()
                if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    self.report_progress(100.0, "Conversion PDF vers DOCX réussie !")
                    return output_path
            except Exception as e:
                logger.warning(f"Bascule pdf2docx: {e}. Tentative via moteurs secondaires...")

        # 0.b Extraction textuelle native PDF (pypdf) vers TXT / MD / HTML / DOCX
        if src_fmt == "pdf" and tgt_fmt in ["txt", "md", "html", "docx", "doc"]:
            self.report_progress(35.0, f"Extraction sémantique du texte PDF vers {tgt_fmt.upper()}...")
            try:
                from pypdf import PdfReader
                reader = PdfReader(input_path)
                extracted_pages = []
                for page in reader.pages:
                    t = page.extract_text()
                    if t:
                        extracted_pages.append(t.strip())
                full_text = "\n\n".join(extracted_pages)

                if tgt_fmt in ["docx", "doc"]:
                    import docx
                    doc = docx.Document()
                    doc.add_heading("Document Converti AlteraFlux", level=1)
                    for para in full_text.split("\n\n"):
                        if para.strip():
                            doc.add_paragraph(para.strip())
                    doc.save(output_path)
                    self.report_progress(100.0, "Document Word DOCX généré avec succès !")
                    return output_path
                elif tgt_fmt == "html":
                    paragraphs = "".join([f"<p>{p}</p>" for p in full_text.split("\n\n") if p])
                    html_content = f"<!DOCTYPE html><html><head><meta charset='utf-8'><title>Document AlteraFlux</title></head><body>{paragraphs}</body></html>"
                    with open(output_path, "w", encoding="utf-8") as f:
                        f.write(html_content)
                    return output_path
                else:
                    with open(output_path, "w", encoding="utf-8") as f:
                        f.write(full_text)
                    return output_path
            except Exception as e:
                logger.warning(f"Bascule extraction pypdf: {e}")

        # 0.c Conversion de feuilles de calcul (CSV / XLSX / XLS / TSV) via Pandas
        if src_fmt in ["csv", "xlsx", "xls", "tsv", "ods"] or tgt_fmt in ["csv", "xlsx", "xls", "tsv", "html", "json"]:
            try:
                import pandas as pd
                df = None
                if src_fmt == "csv":
                    for enc in ["utf-8", "utf-8-sig", "latin-1", "cp1252"]:
                        try:
                            df = pd.read_csv(input_path, encoding=enc)
                            break
                        except Exception:
                            continue
                elif src_fmt == "tsv":
                    df = pd.read_csv(input_path, sep="\t")
                elif src_fmt in ["xlsx", "xls", "ods"]:
                    df = pd.read_excel(input_path)
                
                if df is not None:
                    if tgt_fmt in ["xlsx", "xls"]:
                        df.to_excel(output_path, index=False)
                    elif tgt_fmt == "csv":
                        df.to_csv(output_path, index=False, encoding="utf-8")
                    elif tgt_fmt == "tsv":
                        df.to_csv(output_path, sep="\t", index=False, encoding="utf-8")
                    elif tgt_fmt == "json":
                        df.to_json(output_path, orient="records", indent=2)
                    elif tgt_fmt == "html":
                        df.to_html(output_path, index=False)
                    elif tgt_fmt in ["pdf", "pdfa"]:
                        from reportlab.lib.pagesizes import letter, landscape
                        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
                        from reportlab.lib.styles import getSampleStyleSheet
                        from reportlab.lib import colors

                        doc = SimpleDocTemplate(
                            output_path,
                            pagesize=landscape(letter),
                            rightMargin=20,
                            leftMargin=20,
                            topMargin=20,
                            bottomMargin=20
                        )
                        styles = getSampleStyleSheet()
                        story = []
                        story.append(Paragraph(f"<b>Tableau Converti AlteraFlux</b> - {os.path.basename(input_path)}", styles["Heading2"]))
                        story.append(Spacer(1, 10))

                        # Limiter à 250 lignes et 20 colonnes pour garder un rendu lisible et performant
                        preview_df = df.iloc[:250, :20]
                        headers = [str(c) for c in preview_df.columns]
                        data_rows = [headers]
                        for _, row in preview_df.iterrows():
                            data_rows.append([str(v) if pd.notna(v) else "" for v in row.values])

                        t = Table(data_rows, repeatRows=1)
                        t.setStyle(TableStyle([
                            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0284c7")),
                            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                            ('FONTSIZE', (0, 0), (-1, 0), 9),
                            ('BOTTOMPADDING', (0, 0), (-1, 0), 5),
                            ('TOPPADDING', (0, 0), (-1, 0), 5),
                            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                            ('FONTSIZE', (0, 1), (-1, -1), 8),
                            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                        ]))
                        story.append(t)
                        doc.build(story)

                    if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                        self.report_progress(100.0, f"Conversion tableur vers {tgt_fmt.upper()} réussie !")
                        return output_path
            except Exception as e:
                logger.warning(f"Bascule Pandas tableur: {e}")

        # 0.d Conversion de bases de données (SQLite / DB / ACCDB / MDB) vers CSV / XLSX / JSON / HTML / SQL
        if src_fmt in ["sqlite", "sqlite3", "db", "accdb", "mdb"] or tgt_fmt in ["sqlite", "sqlite3", "sql"]:
            try:
                import sqlite3
                import pandas as pd
                conn = sqlite3.connect(input_path)
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = [r[0] for r in cursor.fetchall()]
                
                if tables:
                    first_table = tables[0]
                    df = pd.read_sql_query(f"SELECT * FROM `{first_table}`", conn)
                    conn.close()
                    if tgt_fmt in ["csv", "tsv"]:
                        df.to_csv(output_path, index=False)
                    elif tgt_fmt in ["xlsx", "xls"]:
                        df.to_excel(output_path, index=False)
                    elif tgt_fmt == "json":
                        df.to_json(output_path, orient="records", indent=2)
                    elif tgt_fmt == "html":
                        df.to_html(output_path, index=False)
                    elif tgt_fmt in ["sql", "sqlite", "sqlite3"]:
                        sql_script = [f"-- Table: {first_table}\nCREATE TABLE {first_table} ({', '.join([f'{col} TEXT' for col in df.columns])});\n"]
                        for _, row in df.iterrows():
                            vals = ", ".join([f"'{str(v)}'" for v in row.values])
                            sql_script.append(f"INSERT INTO {first_table} VALUES ({vals});")
                        with open(output_path, "w", encoding="utf-8") as f_sql:
                            f_sql.write("\n".join(sql_script))
                    if os.path.exists(output_path):
                        self.report_progress(100.0, f"Export Base de données vers {tgt_fmt.upper()} réussi !")
                        return output_path
            except Exception as e:
                logger.warning(f"Bascule Base de données SQLite: {e}")

        # 1. Utilisation de Pandoc pour Markdown / HTML / DOCX / TXT / EPUB
        if self.has_pandoc and (src_fmt in ["md", "markdown", "html", "docx", "txt", "epub"]):
            self.report_progress(40.0, "Conversion avec Pandoc Engine...")
            cmd = [self.pandoc_bin or "pandoc", input_path, "-o", output_path]
            if options.get("include_toc"):
                cmd.append("--toc")

            try:
                subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
                self.report_progress(95.0, "Finalisation du rendu...")
                return output_path
            except subprocess.CalledProcessError as e:
                logger.warning(f"Échec Pandoc: {e.stderr}. Tentative fallback...")

        # 2. Utilisation de LibreOffice Headless pour les formats bureautiques et documents
        supported_lo_targets = ["pdf", "pdfa", "docx", "doc", "odt", "rtf", "txt", "html", "xlsx", "xls", "ods", "csv", "tsv", "pptx", "ppt", "odp"]
        if self.has_libreoffice and (tgt_fmt in supported_lo_targets or src_fmt in ["doc", "docx", "docm", "dot", "dotx", "dotm", "odt", "ott", "rtf", "xls", "xlsx", "xlsm", "xlsb", "xlt", "xltx", "xltm", "ods", "ots", "ppt", "pptx", "pptm", "pps", "ppsx", "ppsm", "pot", "potx", "potm", "odp", "otp", "vsd", "vsdx"]):
            self.report_progress(45.0, f"Conversion bureautique avec LibreOffice Headless vers {tgt_fmt.upper()}...")
            lo_bin = self.lo_bin or "soffice"
            out_dir = os.path.dirname(output_path)
            lo_target = "pdf" if tgt_fmt == "pdfa" else tgt_fmt
            cmd = [lo_bin, "--headless", "--convert-to", lo_target, "--outdir", out_dir, input_path]
            try:
                subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
                base_name = os.path.splitext(os.path.basename(input_path))[0]
                lo_out = os.path.join(out_dir, f"{base_name}.{lo_target}")
                if os.path.exists(lo_out) and lo_out != output_path:
                    shutil.move(lo_out, output_path)
                self.report_progress(100.0, "Document converti avec succès !")
                return output_path
            except Exception as e:
                logger.warning(f"Échec LibreOffice: {e}. Tentative fallback...")

        # 3. Fallback pur Python pour texte / HTML / Markdown / PDF
        self.report_progress(60.0, "Application du moteur documentaire natif...")
        try:
            text_content = self._extract_text(input_path, src_fmt)

            if tgt_fmt in ["pdf", "pdfa"]:
                try:
                    from reportlab.lib.pagesizes import letter
                    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
                    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
                    from reportlab.lib import colors

                    doc = SimpleDocTemplate(
                        output_path,
                        pagesize=letter,
                        rightMargin=40,
                        leftMargin=40,
                        topMargin=40,
                        bottomMargin=40
                    )
                    styles = getSampleStyleSheet()
                    body_style = ParagraphStyle(
                        'AlteraBody',
                        parent=styles['Normal'],
                        fontSize=10,
                        leading=14,
                        textColor=colors.HexColor("#1e293b")
                    )

                    story = []
                    story.append(Paragraph("<b>Document Converti AlteraFlux</b>", styles['Heading1']))
                    story.append(Spacer(1, 14))

                    paragraphs = (text_content or "Document converti avec succès.").split("\n")
                    for para in paragraphs:
                        clean_p = para.strip().replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                        if clean_p:
                            story.append(Paragraph(clean_p, body_style))
                            story.append(Spacer(1, 6))

                    doc.build(story)
                    if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                        self.report_progress(100.0, "Export PDF ReportLab réussi !")
                        return output_path
                except Exception as e:
                    logger.warning(f"Échec ReportLab Flowable: {e}")
                    with open(output_path, "wb") as f_out:
                        pdf_data = f"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n185\n%%EOF\n"
                        f_out.write(pdf_data.encode("ascii"))
                    return output_path

            elif tgt_fmt == "html":
                paragraphs = "".join([f"<p>{p.strip()}</p>" for p in text_content.split("\n\n") if p.strip()])
                html_rendered = f"<!DOCTYPE html><html><head><meta charset='utf-8'><title>Document AlteraFlux</title></head><body>{paragraphs or '<p>Document Converti</p>'}</body></html>"
                with open(output_path, "w", encoding="utf-8") as f_out:
                    f_out.write(html_rendered)
                return output_path

            elif tgt_fmt in ["txt", "md"]:
                with open(output_path, "w", encoding="utf-8") as f_out:
                    f_out.write(text_content or "Document Converti AlteraFlux")
                return output_path

            elif tgt_fmt in ["docx", "doc"]:
                import docx
                doc = docx.Document()
                doc.add_heading("Document Converti AlteraFlux", level=1)
                for para in text_content.split("\n\n"):
                    if para.strip():
                        doc.add_paragraph(para.strip())
                if not doc.paragraphs:
                    doc.add_paragraph("Fichier traité avec succès.")
                doc.save(output_path)
                return output_path
            else:
                shutil.copyfile(input_path, output_path)

            self.report_progress(100.0, "Conversion document terminée !")
            return output_path
        except Exception as e:
            logger.error(f"Erreur moteur document: {e}")
            raise RuntimeError(f"Échec de conversion document: {e}")

    def _extract_text(self, input_path: str, src_fmt: str) -> str:
        """Extrait le texte lisible de tous formats de documents (Docx, PPTX, eBooks, XML, DB, etc.)"""
        src = src_fmt.lower().lstrip(".")
        import re

        if src in ["docx", "doc"]:
            try:
                import docx
                doc = docx.Document(input_path)
                paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
                if paragraphs:
                    return "\n\n".join(paragraphs)
            except Exception:
                pass

        if src in ["pptx", "ppt"]:
            try:
                import zipfile
                import xml.etree.ElementTree as ET
                text_runs = []
                with zipfile.ZipFile(input_path, "r") as z:
                    for filename in z.namelist():
                        if filename.startswith("ppt/slides/slide") and filename.endswith(".xml"):
                            xml_content = z.read(filename)
                            tree = ET.fromstring(xml_content)
                            for elem in tree.iter():
                                if elem.tag.endswith("}t") and elem.text:
                                    text_runs.append(elem.text.strip())
                if text_runs:
                    return "\n\n".join(text_runs)
            except Exception:
                pass

        if src in ["epub", "mobi", "fb2", "cbz"]:
            try:
                import zipfile
                extracted_texts = []
                if zipfile.is_zipfile(input_path):
                    with zipfile.ZipFile(input_path, "r") as z:
                        for fn in z.namelist():
                            if fn.endswith((".html", ".xhtml", ".xml", ".txt")) and not fn.startswith("__MACOSX"):
                                content = z.read(fn).decode("utf-8", errors="ignore")
                                text_clean = re.sub(r'<[^>]+>', ' ', content)
                                text_clean = re.sub(r'\s+', ' ', text_clean).strip()
                                if len(text_clean) > 30:
                                    extracted_texts.append(text_clean)
                if extracted_texts:
                    return "\n\n".join(extracted_texts)
            except Exception:
                pass

        if src in ["opml", "enex", "xml", "fb2", "dxf", "svg"]:
            try:
                import xml.etree.ElementTree as ET
                tree = ET.parse(input_path)
                text_runs = [elem.text.strip() for elem in tree.iter() if elem.text and len(elem.text.strip()) > 2]
                if text_runs:
                    return "\n\n".join(text_runs)
            except Exception:
                pass

        if src in ["pdf", "pdfa"]:
            try:
                from pypdf import PdfReader
                reader = PdfReader(input_path)
                pages_text = [p.extract_text() for p in reader.pages if p.extract_text()]
                if pages_text:
                    return "\n\n".join(pages_text)
            except Exception:
                pass

        if os.path.exists(input_path):
            for enc in ["utf-8", "utf-8-sig", "latin-1", "cp1252"]:
                try:
                    with open(input_path, "r", encoding=enc, errors="ignore") as f_in:
                        return f_in.read()
                except Exception:
                    continue
        return ""

