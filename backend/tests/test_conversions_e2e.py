import os
import json
import zipfile
import tarfile
import tempfile
import pytest
from PIL import Image
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import init_db
from app.security.validator import (
    is_conversion_compatible,
    get_compatible_targets,
    validate_file_integrity
)
from workers.engines import (
    ImageEngine,
    DocumentEngine,
    ArchiveEngine,
    CodeEngine
)

@pytest.fixture(scope="module")
def tmp_dir():
    d = tempfile.mkdtemp(prefix="alteraflux_e2e_test_")
    yield d
    import shutil
    shutil.rmtree(d, ignore_errors=True)


def test_format_compatibility_matrix():
    # Paires compatibles
    ok_png_webp, _ = is_conversion_compatible("png", "webp")
    assert ok_png_webp is True

    ok_csv_xlsx, _ = is_conversion_compatible("csv", "xlsx")
    assert ok_csv_xlsx is True

    ok_csv_pdf, _ = is_conversion_compatible("csv", "pdf")
    assert ok_csv_pdf is True

    ok_docx_pdf, _ = is_conversion_compatible("docx", "pdf")
    assert ok_docx_pdf is True

    ok_zip_targz, _ = is_conversion_compatible("zip", "tar.gz")
    assert ok_zip_targz is True

    ok_json_yaml, _ = is_conversion_compatible("json", "yaml")
    assert ok_json_yaml is True

    # Paires totalement incompatibles (doivent être formellement rejetées)
    bad_mp3_docx, reason = is_conversion_compatible("mp3", "docx")
    assert bad_mp3_docx is False
    assert reason is not None
    assert "Impossible de convertir" in reason


    bad_png_wav, reason_img = is_conversion_compatible("png", "wav")
    assert bad_png_wav is False

    # Formats cibles compatibles
    targets_png = get_compatible_targets("png")
    assert "webp" in targets_png
    assert "jpg" in targets_png
    assert "pdf" in targets_png


def test_file_integrity_validation(tmp_dir):
    # Fichier vide
    empty_file = os.path.join(tmp_dir, "empty.pdf")
    with open(empty_file, "wb") as f:
        pass
    valid, msg = validate_file_integrity(empty_file, "pdf")
    assert valid is False
    assert "vide" in msg

    # Fichier corrompu (faux PDF)
    fake_pdf = os.path.join(tmp_dir, "fake.pdf")
    with open(fake_pdf, "wb") as f:
        f.write(b"NOT A REAL PDF HEADER")
    valid_fake, msg_fake = validate_file_integrity(fake_pdf, "pdf")
    assert valid_fake is False
    assert "Signature binaire PDF invalide" in msg_fake

    # Vrai PDF valide
    real_pdf = os.path.join(tmp_dir, "valid.pdf")
    with open(real_pdf, "wb") as f:
        f.write(b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\nxref\n0 1\ntrailer<</Root 1 0 R>>\n%%EOF")
    valid_real, _ = validate_file_integrity(real_pdf, "pdf")
    assert valid_real is True


def test_image_engine_real_conversions(tmp_dir):
    engine = ImageEngine()
    
    # 1. Création d'une image PNG réelle
    src_png = os.path.join(tmp_dir, "sample.png")
    img = Image.new("RGBA", (100, 100), color=(34, 197, 94, 200))
    img.save(src_png, "PNG")

    # PNG -> WEBP
    out_webp = os.path.join(tmp_dir, "out.webp")
    res_webp = engine.convert(src_png, out_webp, "png", "webp", {"quality": 90})
    assert os.path.exists(res_webp)
    assert os.path.getsize(res_webp) > 0
    valid_webp, _ = validate_file_integrity(res_webp, "webp")
    assert valid_webp is True

    # PNG -> JPEG
    out_jpg = os.path.join(tmp_dir, "out.jpg")
    res_jpg = engine.convert(src_png, out_jpg, "png", "jpg", {"quality": 85})
    assert os.path.exists(res_jpg)
    valid_jpg, _ = validate_file_integrity(res_jpg, "jpg")
    assert valid_jpg is True

    # PNG -> PDF
    out_pdf = os.path.join(tmp_dir, "img_out.pdf")
    res_pdf = engine.convert(src_png, out_pdf, "png", "pdf", {})
    assert os.path.exists(res_pdf)
    valid_pdf, _ = validate_file_integrity(res_pdf, "pdf")
    assert valid_pdf is True

    # PDF -> PNG (rendu PyMuPDF)
    out_rendered_png = os.path.join(tmp_dir, "rendered.png")
    res_rendered = engine.convert(res_pdf, out_rendered_png, "pdf", "png", {})
    assert os.path.exists(res_rendered)
    valid_rendered, _ = validate_file_integrity(res_rendered, "png")
    assert valid_rendered is True


def test_document_engine_real_conversions(tmp_dir):
    engine = DocumentEngine()

    # 1. TXT -> PDF
    src_txt = os.path.join(tmp_dir, "sample.txt")
    with open(src_txt, "w", encoding="utf-8") as f:
        f.write("AlteraFlux conversion test.\nDeuxième paragraphe de test unitaire.\nTroisième ligne.")

    out_pdf = os.path.join(tmp_dir, "doc_out.pdf")
    res_pdf = engine.convert(src_txt, out_pdf, "txt", "pdf", {})
    assert os.path.exists(res_pdf)
    assert os.path.getsize(res_pdf) > 0
    valid_pdf, _ = validate_file_integrity(res_pdf, "pdf")
    assert valid_pdf is True

    # 2. TXT -> DOCX
    out_docx = os.path.join(tmp_dir, "doc_out.docx")
    res_docx = engine.convert(src_txt, out_docx, "txt", "docx", {})
    assert os.path.exists(res_docx)
    valid_docx, _ = validate_file_integrity(res_docx, "docx")
    assert valid_docx is True

    # 3. DOCX -> TXT
    out_txt_from_docx = os.path.join(tmp_dir, "from_docx.txt")
    res_txt = engine.convert(res_docx, out_txt_from_docx, "docx", "txt", {})
    assert os.path.exists(res_txt)
    with open(res_txt, "r", encoding="utf-8", errors="ignore") as f:
        extracted = f.read()
    assert "AlteraFlux" in extracted


def test_spreadsheet_engine_real_conversions(tmp_dir):
    engine = DocumentEngine()

    # CSV source
    src_csv = os.path.join(tmp_dir, "data.csv")
    with open(src_csv, "w", encoding="utf-8") as f:
        f.write("id,produit,prix,quantite\n1,Widget A,19.99,10\n2,Widget B,49.99,5\n3,Service Cloud,120.0,2\n")

    # CSV -> XLSX
    out_xlsx = os.path.join(tmp_dir, "data.xlsx")
    res_xlsx = engine.convert(src_csv, out_xlsx, "csv", "xlsx", {})
    assert os.path.exists(res_xlsx)
    valid_xlsx, _ = validate_file_integrity(res_xlsx, "xlsx")
    assert valid_xlsx is True

    # XLSX -> CSV
    out_csv2 = os.path.join(tmp_dir, "data_from_excel.csv")
    res_csv2 = engine.convert(res_xlsx, out_csv2, "xlsx", "csv", {})
    assert os.path.exists(res_csv2)
    with open(res_csv2, "r", encoding="utf-8") as f:
        content = f.read()
    assert "Widget A" in content

    # CSV -> PDF (Table ReportLab)
    out_pdf = os.path.join(tmp_dir, "data.pdf")
    res_pdf = engine.convert(src_csv, out_pdf, "csv", "pdf", {})
    assert os.path.exists(res_pdf)
    valid_pdf, _ = validate_file_integrity(res_pdf, "pdf")
    assert valid_pdf is True

    # CSV -> JSON
    out_json = os.path.join(tmp_dir, "data.json")
    res_json = engine.convert(src_csv, out_json, "csv", "json", {})
    assert os.path.exists(res_json)
    with open(res_json, "r", encoding="utf-8") as f:
        parsed = json.load(f)
    assert len(parsed) == 3
    assert parsed[0]["produit"] == "Widget A"


def test_archive_engine_real_conversions(tmp_dir):
    engine = ArchiveEngine()

    # Création d'une archive ZIP source avec 2 fichiers réels
    sub_file1 = os.path.join(tmp_dir, "file1.txt")
    with open(sub_file1, "w", encoding="utf-8") as f:
        f.write("Contenu fichier 1 pour test d'archive.")

    sub_file2 = os.path.join(tmp_dir, "file2.json")
    with open(sub_file2, "w", encoding="utf-8") as f:
        f.write(json.dumps({"test": "ok", "archive": True}))

    src_zip = os.path.join(tmp_dir, "archive_source.zip")
    with zipfile.ZipFile(src_zip, "w") as zf:
        zf.write(sub_file1, arcname="file1.txt")
        zf.write(sub_file2, arcname="file2.json")

    assert zipfile.is_zipfile(src_zip)

    # ZIP -> TAR.GZ
    out_targz = os.path.join(tmp_dir, "archive_converted.tar.gz")
    res_targz = engine.convert(src_zip, out_targz, "zip", "tar.gz", {})
    assert os.path.exists(res_targz)
    assert tarfile.is_tarfile(res_targz)
    valid_tgz, _ = validate_file_integrity(res_targz, "tar.gz")
    assert valid_tgz is True

    # Vérification du contenu extrait du TAR.GZ
    with tarfile.open(res_targz, "r:gz") as tf:
        names = tf.getnames()
        assert "file1.txt" in names
        assert "file2.json" in names

    # TAR.GZ -> ZIP
    out_zip2 = os.path.join(tmp_dir, "archive_reconverted.zip")
    res_zip2 = engine.convert(res_targz, out_zip2, "tar.gz", "zip", {})
    assert os.path.exists(res_zip2)
    assert zipfile.is_zipfile(res_zip2)
    with zipfile.ZipFile(res_zip2, "r") as zf2:
        names2 = zf2.namelist()
        assert "file1.txt" in names2
        assert "file2.json" in names2


def test_code_engine_data_conversions(tmp_dir):
    engine = CodeEngine()

    sample_dict = {
        "title": "AlteraFlux Config",
        "port": 8000,
        "features": ["conversion", "security", "real-time"]
    }
    src_json = os.path.join(tmp_dir, "config.json")
    with open(src_json, "w", encoding="utf-8") as f:
        json.dump(sample_dict, f, indent=2)

    # JSON -> YAML
    out_yaml = os.path.join(tmp_dir, "config.yaml")
    res_yaml = engine.convert(src_json, out_yaml, "json", "yaml", {})
    assert os.path.exists(res_yaml)
    import yaml
    with open(res_yaml, "r", encoding="utf-8") as yf:
        parsed_yaml = yaml.safe_load(yf)
    assert parsed_yaml["title"] == "AlteraFlux Config"
    assert parsed_yaml["port"] == 8000

    # YAML -> JSON
    out_json2 = os.path.join(tmp_dir, "config_reverted.json")
    res_json2 = engine.convert(res_yaml, out_json2, "yaml", "json", {})
    assert os.path.exists(res_json2)
    valid_json, _ = validate_file_integrity(res_json2, "json")
    assert valid_json is True


@pytest.mark.asyncio
async def test_api_rejection_of_incompatible_conversion():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Test endpoint compatible-formats
        resp = await ac.get("/api/v1/conversions/compatible-formats?source=csv")
        assert resp.status_code == 200
        data = resp.json()
        assert "xlsx" in data["compatible_targets"]
        assert "pdf" in data["compatible_targets"]

        # 2. Création job avec format incompatible (doit retourner HTTP 400)
        res_bad = await ac.post(
            "/api/v1/conversions/jobs",
            headers={"x-client-id": "client_test_compat_999"},
            json={
                "filename": "audio_track.mp3",
                "source_key": "uploads/fake_key/audio_track.mp3",
                "source_format": "mp3",
                "target_format": "docx",
                "category": "audio"
            }
        )
        assert res_bad.status_code == 400
        err_detail = res_bad.json()["detail"]
        assert "Impossible de convertir" in err_detail

