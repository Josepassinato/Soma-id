"""
SOMA-ID Backend API Tests
Tests for Gemini API endpoints including image generation, health check, and consultation analysis
"""
import pytest
import requests
import os
import time

# Use the public URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://floor-plan-ai-1.preview.emergentagent.com')

class TestHealthEndpoints:
    """Health check endpoint tests"""
    
    def test_root_endpoint(self):
        """Test root API endpoint returns correct message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "SOMA-ID" in data["message"]
        print(f"✓ Root endpoint OK: {data['message']}")
    
    def test_gemini_health_check(self):
        """Test Gemini API health check endpoint"""
        response = requests.get(f"{BASE_URL}/api/gemini/health")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "status" in data
        assert "latency" in data
        
        # Check if Gemini is healthy
        if data["status"] == "healthy":
            print(f"✓ Gemini API healthy - Latency: {data['latency']}ms")
            assert data["latency"] >= 0
        else:
            print(f"⚠ Gemini API status: {data['status']} - {data.get('message', 'No message')}")
        
        return data


class TestImageGeneration:
    """Image generation endpoint tests using Gemini Nano Banana"""
    
    def test_generate_image_basic(self):
        """Test image generation with a basic prompt"""
        payload = {
            "prompt": "Modern minimalist kitchen with white oak cabinets, marble countertop, warm LED lighting, professional interior photography",
            "materialPhoto": None
        }
        
        response = requests.post(
            f"{BASE_URL}/api/gemini/generate-image",
            json=payload,
            timeout=120  # Image generation can take time
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "status" in data
        assert data["status"] == "success"
        assert "data" in data
        
        result = data["data"]
        
        # Check if image was actually generated
        if result.get("generated") == True:
            assert "image" in result
            assert result["image"].startswith("data:image/")
            # Verify base64 data exists
            assert ";base64," in result["image"]
            base64_data = result["image"].split(";base64,")[1]
            assert len(base64_data) > 100  # Should have substantial image data
            print(f"✓ Image generated successfully - Size: {len(base64_data)} chars")
        else:
            # Image not generated, check for description
            print(f"⚠ Image not generated: {result.get('note', 'No note')}")
            assert "description" in result
        
        return data
    
    def test_generate_image_with_style(self):
        """Test image generation with detailed style description"""
        payload = {
            "prompt": "Luxury Japandi style bedroom with custom walnut wardrobe, integrated LED lighting, minimalist design, 4K architectural render, soft natural light",
            "materialPhoto": None
        }
        
        response = requests.post(
            f"{BASE_URL}/api/gemini/generate-image",
            json=payload,
            timeout=120
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        result = data["data"]
        if result.get("generated"):
            print(f"✓ Styled image generated - Has image: {bool(result.get('image'))}")
        else:
            print(f"⚠ Styled image returned description only")
        
        return data


class TestConsultationAnalysis:
    """Consultation analysis endpoint tests"""
    
    def test_analyze_text_consultation_pt(self):
        """Test text consultation analysis in Portuguese"""
        payload = {
            "input": {
                "type": "TEXT",
                "content": "Cliente João Silva precisa de uma cozinha moderna de 3 metros de largura, estilo minimalista com acabamento em carvalho",
                "mimeType": None
            },
            "language": "pt"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/gemini/analyze-consultation",
            json=payload,
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        result = data["data"]
        # Verify extracted fields
        assert "clientName" in result
        assert "roomType" in result
        assert "wallWidth" in result
        assert "analysisStatus" in result
        
        print(f"✓ Consultation analyzed - Client: {result.get('clientName')}, Room: {result.get('roomType')}, Width: {result.get('wallWidth')}mm")
        return data
    
    def test_analyze_text_consultation_en(self):
        """Test text consultation analysis in English"""
        payload = {
            "input": {
                "type": "TEXT",
                "content": "Client John Smith needs a modern kitchen 3 meters wide, minimalist style with oak finish",
                "mimeType": None
            },
            "language": "en"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/gemini/analyze-consultation",
            json=payload,
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        result = data["data"]
        assert "clientName" in result
        print(f"✓ English consultation analyzed - Client: {result.get('clientName')}")
        return data
    
    def test_analyze_text_consultation_es(self):
        """Test text consultation analysis in Spanish"""
        payload = {
            "input": {
                "type": "TEXT",
                "content": "Cliente Juan García necesita una cocina moderna de 3 metros de ancho, estilo minimalista con acabado en roble",
                "mimeType": None
            },
            "language": "es"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/gemini/analyze-consultation",
            json=payload,
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        result = data["data"]
        assert "clientName" in result
        print(f"✓ Spanish consultation analyzed - Client: {result.get('clientName')}")
        return data


class TestPromptGeneration:
    """Prompt generation endpoint tests"""
    
    def test_generate_prompt(self):
        """Test architectural visualization prompt generation"""
        payload = {
            "clientName": "Test Client",
            "roomType": "Cozinha",
            "wallWidth": 3000,
            "wallHeight": 2700,
            "styleDescription": "moderno_organico",
            "angle": "Frontal View",
            "language": "pt"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/gemini/generate-prompt",
            json=payload,
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data
        assert "prompt" in data["data"]
        
        prompt = data["data"]["prompt"]
        assert len(prompt) > 50  # Should be a substantial prompt
        print(f"✓ Prompt generated - Length: {len(prompt)} chars")
        return data


class TestTechnicalData:
    """Technical data generation endpoint tests"""
    
    def test_generate_technical_data(self):
        """Test technical blueprint data generation"""
        payload = {
            "clientName": "Test Client",
            "roomType": "Cozinha",
            "wallWidth": 3000,
            "wallHeight": 2700,
            "wallDepth": 600,
            "styleDescription": "Modern minimalist kitchen",
            "language": "pt"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/gemini/generate-technical-data",
            json=payload,
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        result = data["data"]
        # Verify technical data structure
        assert "layoutType" in result or "mainWall" in result
        print(f"✓ Technical data generated - Layout: {result.get('layoutType', 'N/A')}")
        return data


class TestStatusEndpoints:
    """Status check endpoints tests"""
    
    def test_create_status_check(self):
        """Test creating a status check entry"""
        payload = {
            "client_name": "TEST_pytest_client"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/status",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "client_name" in data
        assert data["client_name"] == "TEST_pytest_client"
        print(f"✓ Status check created - ID: {data['id']}")
        return data
    
    def test_get_status_checks(self):
        """Test retrieving status checks"""
        response = requests.get(f"{BASE_URL}/api/status")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Status checks retrieved - Count: {len(data)}")
        return data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
