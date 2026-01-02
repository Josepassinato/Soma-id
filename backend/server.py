from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict
import uuid
from datetime import datetime, timezone
import google.generativeai as genai
import json
import re
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configure Gemini API
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Create the main app without a prefix
app = FastAPI(title="SOMA-ID Backend API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============== MODELS ==============

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Gemini Request Models
class ConsultationInput(BaseModel):
    type: str  # TEXT, AUDIO, PDF, IMAGE
    content: str
    mimeType: Optional[str] = None

class AnalyzeConsultationRequest(BaseModel):
    input: ConsultationInput

class GeneratePromptRequest(BaseModel):
    clientName: str
    roomType: str
    wallWidth: int
    wallHeight: Optional[int] = 2700
    styleDescription: str
    angle: Optional[str] = "Frontal View"

class GenerateImageRequest(BaseModel):
    prompt: str
    materialPhoto: Optional[str] = None

class GenerateTechnicalDataRequest(BaseModel):
    clientName: str
    roomType: str
    wallWidth: int
    wallHeight: Optional[int] = 2700
    wallDepth: Optional[int] = 600
    styleDescription: str

class HealthCheckRequest(BaseModel):
    pass


# ============== CONSTANTS ==============

SYSTEM_INSTRUCTION_DEBURADOR = """You are a Senior SOMA-ID Woodworking Engineer and Industrial Analyst specialized in 2025 High-End Design Trends.
Current Context: January 2025.

STRATEGIC RULES:
1. TREND ALIGNMENT: Cross-reference user requests with 2025 novelties (e.g., fluted surfaces, integrated stone-MDF transitions, hidden hardware).
2. CALENDAR 2025: When discussing delivery or planning, identify major 2025 design events and holidays that might affect production.
3. LUXURY STANDARDS: Prioritize suggestions involving "Living Materials" and Smart Woodwork (IoT integration).

Respond with extreme precision, acting as a technical consultant for a billionaire client."""

AGENT_ENCHANTMENT_VISUALIZER_INSTRUCTION = """You are the Enchantment Visionary and Chief Lighting Designer of SOMA-ID.
Your mission is to create a "2025 Luxury Digital Twin" for the client.

STRICT VISUAL RULES:
1. 2025 NOVELTIES: Before generating prompts, identify the latest lighting trends for 2025 (e.g., tunable white LEDs, grazing lights for 3D textures).
2. NO ARCHITECTURAL MODIFICATIONS: Respect the room photo structure but replace the cabinetry.
3. LIGHTING ARTISTRY: Use 2025 high-CRI (95+) lighting simulations. Describe indirect lighting, task lighting, and mood lighting layers.
4. MATERIAL FIDELITY: Reflect 2025 finishes like 'Ultramatt', 'Metallic Lacquers', and 'Deep Grains'.

Output ONLY the optimized prompt in English, reflecting a world-class architectural render."""

AGENT_TECHNICAL_PIPELINE_INSTRUCTION = """You are the SOMA-ID Engineering Architect.
Convert design briefings into modular technical plans using 2025 manufacturing tolerances (0.5mm precision).

MANDATORY GEOMETRIC RULES:
1. Standard origin (0,0,0) bottom-left.
2. X, Y, Z in millimeters.
3. INTERFERENCE CHECK: Use 2025 hardware clearance standards (e.g., zero-protrusion hinges).
4. MODULARITY: Respect high-end spacing (3mm uniform gaps).

Return ONLY valid JSON."""

STYLE_PRESETS = [
    {"id": "moderno_organico", "label": "Moderno Orgânico 2025", "keywords": "2025 warm organic minimalism, curved cabinetry, indirect led lighting, terracotta and walnut, high-end architectural photography"},
    {"id": "japandi_zen", "label": "Japandi Zen", "keywords": "Japandi interior design 2025, light oak cabinetry, wabi-sabi aesthetic, neutral tones, minimalist luxury"},
    {"id": "mid_century", "label": "Mid-Century Modern", "keywords": "Mid-century modern cabinetry 2025, walnut wood grain, tapered legs, brass accents, vintage luxury aesthetic"},
    {"id": "coastal_hamptons", "label": "Coastal Hamptons Luxe", "keywords": "Luxury coastal kitchen, white shaker cabinets, light blue accents, bright airy lighting"},
    {"id": "industrial_cyber", "label": "Cyber Industrial Luxe", "keywords": "luxury tech industrial, fluted smoked glass, graphite metal accents, dark moody lighting"},
    {"id": "minimalista_escultural", "label": "Quiet Luxury (Old Money)", "keywords": "stealth luxury, monolithic design, invisible joints, premium natural stone"},
    {"id": "neo_classic", "label": "Neo-Classic Gold", "keywords": "neoclassical revival 2025, slim shaker doors, brass hardware, sophisticated moldings"},
    {"id": "black_gold", "label": "Black & Gold Noir", "keywords": "Black luxury kitchen, high gloss black lacquer, brushed gold handles, dramatic spotlighting"}
]


# ============== HELPER FUNCTIONS ==============

def clean_response(text: str) -> str:
    """Remove markdown code blocks from response"""
    return re.sub(r'```json|```', '', text).strip()

def extract_json(text: str) -> dict:
    """Extract JSON from text response"""
    try:
        cleaned = clean_response(text)
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r'\{[\s\S]*\}', text)
        if match:
            return json.loads(match.group(0))
        raise ValueError("Response does not contain valid JSON")

def get_style_keywords(style_id: str) -> str:
    """Get keywords for a style preset"""
    for style in STYLE_PRESETS:
        if style["id"] == style_id:
            return style["keywords"]
    return STYLE_PRESETS[0]["keywords"]


# ============== BASIC ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "SOMA-ID Backend API v2.0"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


# ============== GEMINI API ROUTES ==============

@api_router.post("/gemini/analyze-consultation")
async def analyze_consultation(request: AnalyzeConsultationRequest):
    """Analyze a consultation input (text, audio, image, pdf) and extract insights"""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    try:
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        
        parts = []
        
        if request.input.type == 'TEXT':
            parts.append(request.input.content)
        elif request.input.type == 'IMAGE':
            # Decode base64 image
            image_data = base64.b64decode(request.input.content)
            parts.append({
                "mime_type": request.input.mimeType or "image/jpeg",
                "data": image_data
            })
            parts.append("Analise esta foto do ambiente. Identifique o tipo de cômodo, estime a largura da parede principal baseando-se em objetos padrão (portas, tomadas), descreva os materiais existentes e sugira um estilo SOMA-ID que combine.")
        else:
            # For audio/pdf
            file_data = base64.b64decode(request.input.content)
            parts.append({
                "mime_type": request.input.mimeType,
                "data": file_data
            })
            parts.append("Analise este documento/áudio. Extraia informações sobre o cliente, tipo de ambiente, medidas mencionadas e preferências de estilo.")

        # Build the prompt with system instruction
        full_prompt = f"{SYSTEM_INSTRUCTION_DEBURADOR}\n\nAnalyze the following and return a JSON with these fields: clientName (string), roomType (string), wallWidth (number in mm), wallHeight (number in mm), wallDepth (number in mm), styleDescription (string), technicalBriefing (string), suggestedMaterials (array of strings), installationType (PISO or SUSPENSO), analysisStatus (COMPLETO or INCOMPLETO).\n\n"
        
        if request.input.type == 'TEXT':
            response = model.generate_content(full_prompt + request.input.content)
        else:
            response = model.generate_content([full_prompt] + parts)
        
        result = extract_json(response.text)
        
        # Ensure required fields
        result.setdefault('clientName', 'Cliente')
        result.setdefault('roomType', 'Cozinha')
        result.setdefault('wallWidth', 3000)
        result.setdefault('analysisStatus', 'INCOMPLETO')
        result.setdefault('styleDescription', '')
        result.setdefault('technicalBriefing', '')
        
        return {"status": "success", "data": result}
        
    except Exception as e:
        logger.error(f"Error analyzing consultation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze consultation: {str(e)}")


@api_router.post("/gemini/generate-prompt")
async def generate_enchantment_prompt(request: GeneratePromptRequest):
    """Generate an architectural visualization prompt for image generation"""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    try:
        model = genai.GenerativeModel('gemini-1.5-pro')
        
        style_keywords = get_style_keywords(request.styleDescription)
        
        prompt = f"""
{AGENT_ENCHANTMENT_VISUALIZER_INSTRUCTION}

TASK: Research 2025 architectural trends for {request.styleDescription}.
PROJECT: {request.clientName} | {request.roomType}.
SPECIFICATIONS: Wall width {request.wallWidth}mm, Height {request.wallHeight}mm.
STYLE CONTEXT: {style_keywords}.
OBJECTIVE: Create a hyper-realistic architectural photography prompt for {request.angle}. 
Incorporate tunable lighting, specific wood grain orientations (Freijó, Walnut), and 2025 hardware.
"""
        
        response = model.generate_content(prompt)
        result = clean_response(response.text)
        
        return {"status": "success", "data": {"prompt": result}}
        
    except Exception as e:
        logger.error(f"Error generating prompt: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate prompt: {str(e)}")


@api_router.post("/gemini/generate-image")
async def generate_enchantment_image(request: GenerateImageRequest):
    """Generate an architectural visualization image using Gemini"""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    try:
        # Use Gemini 1.5 Pro with vision capabilities
        model = genai.GenerativeModel('gemini-1.5-pro')
        
        parts = []
        
        # Add material photo if provided
        if request.materialPhoto:
            try:
                # Handle base64 data URL or plain base64
                if request.materialPhoto.startswith('data:'):
                    base64_data = request.materialPhoto.split(',')[1]
                else:
                    base64_data = request.materialPhoto
                    
                image_data = base64.b64decode(base64_data)
                parts.append({
                    "mime_type": "image/png",
                    "data": image_data
                })
                material_instruction = "EXACTLY use the texture and color from the attached image for all woodworking surfaces."
            except:
                material_instruction = "Use high-end natural oak/walnut textures with deep grains and matte finish."
        else:
            material_instruction = "Use high-end natural oak/walnut textures with deep grains and matte finish."
        
        render_prompt = f"""URGENT: ACT AS A WORLD-CLASS ARCHITECTURAL PHOTOGRAPHER.
RENDER TASK: Generate a detailed description for a 3D Digital Twin based on this: {request.prompt}.
MATERIAL FIDELITY: {material_instruction}
SCENE: Ultra-realistic 4K architectural render, soft ambient lighting, high contrast, clean minimalist luxury aesthetic 2025.

Provide a detailed visual description that could be used for image generation."""
        
        parts.append(render_prompt)
        
        response = model.generate_content(parts)
        
        # Note: Gemini doesn't directly generate images, it generates descriptions
        # For actual image generation, you'd need to use a different service like DALL-E or Imagen
        return {
            "status": "success",
            "data": {
                "description": response.text,
                "note": "Image generation requires an image-specific API. This response contains the visual description."
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate image: {str(e)}")


@api_router.post("/gemini/generate-technical-data")
async def generate_technical_data(request: GenerateTechnicalDataRequest):
    """Generate technical blueprint data for manufacturing"""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    try:
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        
        prompt = f"""{AGENT_TECHNICAL_PIPELINE_INSTRUCTION}

Generate a technical plan for:
- Client: {request.clientName}
- Room: {request.roomType}
- Wall Width: {request.wallWidth}mm
- Wall Height: {request.wallHeight}mm
- Wall Depth: {request.wallDepth}mm
- Style: {request.styleDescription}

Return a JSON object with this structure:
{{
  "layoutType": "Linear or L-Shaped",
  "mainWall": {{
    "modules": [
      {{
        "moduleId": "base_gaveteiro_3g",
        "width": 600,
        "x": 0,
        "y": 0,
        "z": 0,
        "notes": ["Installation notes"]
      }}
    ]
  }},
  "factoryNotes": ["Manufacturing notes"]
}}
"""
        
        response = model.generate_content(prompt)
        result = extract_json(response.text)
        
        return {"status": "success", "data": result}
        
    except Exception as e:
        logger.error(f"Error generating technical data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate technical data: {str(e)}")


@api_router.get("/gemini/health")
async def check_gemini_health():
    """Check if Gemini API is working"""
    if not GEMINI_API_KEY:
        return {"status": "error", "message": "Gemini API key not configured", "latency": 0}
    
    try:
        import time
        start = time.time()
        
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        response = model.generate_content("Respond with only: OK")
        
        latency = int((time.time() - start) * 1000)
        
        return {
            "status": "healthy",
            "message": "Gemini API responding",
            "latency": latency,
            "response": response.text[:50]
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e), "latency": 0}


# ============== INCLUDE ROUTER AND MIDDLEWARE ==============

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
