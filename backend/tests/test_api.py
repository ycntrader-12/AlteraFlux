import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import init_db

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.mark.asyncio
async def test_root_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "AlteraFlux" in data["name"]
    assert data["status"] == "online"

@pytest.mark.asyncio
async def test_presets_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/presets")
    assert response.status_code == 200
    presets = response.json()
    assert len(presets) >= 4
    categories = [p["category"] for p in presets]
    assert "video" in categories
    assert "audio" in categories
    assert "image" in categories
    assert "code" in categories

@pytest.mark.asyncio
async def test_create_and_get_job():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Création d'une URL de téléversement
        presigned_res = await ac.post("/api/v1/storage/upload-url", json={
            "filename": "sample_video.mp4",
            "content_type": "video/mp4",
            "size_bytes": 1024000
        })
        assert presigned_res.status_code == 200
        upload_data = presigned_res.json()
        assert "upload_url" in upload_data
        assert "key" in upload_data

        # Création du job
        job_res = await ac.post("/api/v1/conversions/jobs", json={
            "filename": "sample_video.mp4",
            "source_key": upload_data["key"],
            "source_format": "mp4",
            "target_format": "mp3",
            "category": "video",
            "options": {"audio_bitrate": "192k"}
        })
        assert job_res.status_code == 200
        job_data = job_res.json()
        job_id = job_data["id"]
        assert job_data["status"] in ["QUEUED", "PROCESSING", "COMPLETED"]
        assert job_data["target_format"] == "mp3"

        # Lecture du job
        get_res = await ac.get(f"/api/v1/conversions/jobs/{job_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == job_id
