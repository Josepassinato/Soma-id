"""
SOMA-ID Catalog API Tests
Tests for catalog endpoints: modules and materials
"""
import pytest
import requests
import os

# Use the public URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://floor-plan-ai-1.preview.emergentagent.com')


class TestCatalogModules:
    """Module catalog endpoint tests"""
    
    def test_get_all_modules(self):
        """Test retrieving all cabinet modules"""
        response = requests.get(f"{BASE_URL}/api/catalog/modules")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert data["status"] == "success"
        assert "data" in data
        assert isinstance(data["data"], list)
        assert len(data["data"]) > 0
        
        # Verify module structure
        module = data["data"][0]
        assert "id" in module
        assert "name" in module
        assert "category" in module
        print(f"✓ Retrieved {len(data['data'])} modules - Source: {data.get('source', 'unknown')}")
    
    def test_get_module_by_id(self):
        """Test retrieving a specific module by ID"""
        # First get all modules to get a valid ID
        all_response = requests.get(f"{BASE_URL}/api/catalog/modules")
        modules = all_response.json()["data"]
        
        if len(modules) > 0:
            module_id = modules[0]["id"]
            response = requests.get(f"{BASE_URL}/api/catalog/modules/{module_id}")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["status"] == "success"
            assert data["data"]["id"] == module_id
            print(f"✓ Retrieved module by ID: {module_id}")
    
    def test_get_module_not_found(self):
        """Test 404 response for non-existent module"""
        response = requests.get(f"{BASE_URL}/api/catalog/modules/nonexistent_module_id")
        
        assert response.status_code == 404
        print("✓ Correctly returned 404 for non-existent module")


class TestCatalogMaterials:
    """Material catalog endpoint tests"""
    
    def test_get_all_materials(self):
        """Test retrieving all materials"""
        response = requests.get(f"{BASE_URL}/api/catalog/materials")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "success"
        assert "data" in data
        assert isinstance(data["data"], list)
        assert len(data["data"]) > 0
        
        # Verify material structure
        material = data["data"][0]
        assert "id" in material
        assert "name" in material
        assert "category" in material
        print(f"✓ Retrieved {len(data['data'])} materials - Source: {data.get('source', 'unknown')}")
    
    def test_get_material_by_id(self):
        """Test retrieving a specific material by ID"""
        # First get all materials to get a valid ID
        all_response = requests.get(f"{BASE_URL}/api/catalog/materials")
        materials = all_response.json()["data"]
        
        if len(materials) > 0:
            material_id = materials[0]["id"]
            response = requests.get(f"{BASE_URL}/api/catalog/materials/{material_id}")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["status"] == "success"
            assert data["data"]["id"] == material_id
            print(f"✓ Retrieved material by ID: {material_id}")
    
    def test_get_material_not_found(self):
        """Test 404 response for non-existent material"""
        response = requests.get(f"{BASE_URL}/api/catalog/materials/nonexistent_material_id")
        
        assert response.status_code == 404
        print("✓ Correctly returned 404 for non-existent material")


class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_kubernetes_health(self):
        """Test the Kubernetes health endpoint at /health"""
        response = requests.get(f"{BASE_URL}/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert data["status"] == "healthy"
        print(f"✓ Kubernetes health check OK: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
