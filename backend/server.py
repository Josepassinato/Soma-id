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
# Use the new google-genai SDK (replacing deprecated google.generativeai)
from google import genai
from google.genai import types
import json
import re
import base64
import asyncio
import httpx
from bs4 import BeautifulSoup
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection - use environment variable or default
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'soma_id_db')

# Initialize MongoDB client with error handling
try:
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    logging.info(f"MongoDB client initialized for database: {db_name}")
except Exception as e:
    logging.error(f"Failed to initialize MongoDB client: {e}")
    client = None
    db = None

# Configure Gemini API with new SDK
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
genai_client = None
if GEMINI_API_KEY:
    genai_client = genai.Client(api_key=GEMINI_API_KEY)

# Emergent LLM Key for image generation
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

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
    userDescription: Optional[str] = None  # Additional context from user

class AnalyzeConsultationRequest(BaseModel):
    input: ConsultationInput
    language: Optional[str] = "pt"  # pt, en, es

class GeneratePromptRequest(BaseModel):
    clientName: str
    roomType: str
    wallWidth: int
    wallHeight: Optional[int] = 2700
    styleDescription: str
    angle: Optional[str] = "Frontal View"
    language: Optional[str] = "pt"  # pt, en, es

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
    language: Optional[str] = "pt"  # pt, en, es

class HealthCheckRequest(BaseModel):
    pass

# Floor Plan Analysis Models
class AnalyzeFloorPlanRequest(BaseModel):
    imageBase64: str
    mimeType: Optional[str] = "image/jpeg"
    clientName: Optional[str] = None
    projectContext: Optional[str] = None
    language: Optional[str] = "pt"  # pt, en, es

class FloorPlanRoom(BaseModel):
    name: str
    dimensions: Optional[str] = None
    area_sqft: Optional[float] = None
    features: List[str] = []
    woodwork_potential: List[str] = []

class FloorPlanAnalysis(BaseModel):
    rooms: List[FloorPlanRoom]
    total_bedrooms: int
    total_bathrooms: float
    layout_type: str
    floor_level: str
    questions_for_user: List[str] = []
    woodwork_opportunities: List[Dict[str, Any]] = []
    summary: str

# Import Briefing from URL Models
class ImportBriefingRequest(BaseModel):
    urls: List[str]  # Changed to list of URLs
    language: Optional[str] = "pt"

class CabinetAreaSpec(BaseModel):
    name: str
    style: str = "european_flat"
    doorType: str = "flat"
    boxMaterial: str = "plywood_3_4"
    doorMaterial: str = "mdf_3_4"
    finish: str = "wood_textured"
    hinges: str = "blum_soft"
    slides: str = "blum_undermount"
    dimensions: str = ""
    components: List[str] = []
    notes: str = ""

class ImportedBriefingData(BaseModel):
    clientName: str = ""
    projectAddress: str = ""
    areas: List[CabinetAreaSpec] = []
    includedItems: List[str] = []
    excludedItems: List[str] = []
    generalNotes: str = ""
    rawExtractedText: str = ""

class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class FloorPlanChatRequest(BaseModel):
    sessionId: str
    message: str
    floorPlanAnalysis: Optional[Dict] = None
    imageBase64: Optional[str] = None
    language: Optional[str] = "pt"  # pt, en, es

class SelectRoomForProjectRequest(BaseModel):
    sessionId: str
    roomName: str
    woodworkType: str
    floorPlanAnalysis: Dict
    language: Optional[str] = "pt"  # pt, en, es


# ============== LANGUAGE HELPERS ==============

def get_language_instruction(language: str) -> str:
    """Get language instruction for AI prompts"""
    instructions = {
        "pt": "IMPORTANTE: Responda SEMPRE em Português do Brasil. Todos os textos, nomes de cômodos, descrições e perguntas devem estar em português.",
        "en": "IMPORTANT: Always respond in English. All texts, room names, descriptions and questions must be in English.",
        "es": "IMPORTANTE: Responda SIEMPRE en Español. Todos los textos, nombres de habitaciones, descripciones y preguntas deben estar en español."
    }
    return instructions.get(language, instructions["pt"])


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

FLOOR_PLAN_ANALYZER_INSTRUCTION = """You are the SOMA-ID Floor Plan Analyzer - an expert in reading architectural floor plans and identifying woodworking opportunities.

YOUR MISSION:
1. Extract ALL rooms from the floor plan with their dimensions
2. Identify which rooms have potential for custom cabinetry/woodwork
3. Generate specific questions if information is unclear or missing
4. Suggest woodwork opportunities for each relevant room

ANALYSIS RULES:
1. Extract room names EXACTLY as labeled in the plan
2. Convert dimensions to millimeters (1 foot = 304.8mm, 1 inch = 25.4mm)
3. Identify ceiling heights when visible
4. Note special features (walk-in closets, built-in storage, etc.)

WOODWORK OPPORTUNITIES TO IDENTIFY:
- Kitchens: Cabinets, islands, pantries
- Bedrooms: Closets, wardrobes, headboards
- Bathrooms: Vanities, linen cabinets
- Living areas: Entertainment centers, bookcases
- Home offices: Desks, shelving systems
- Closets: Custom organization systems

QUESTIONS TO ASK USER:
- If room purpose is ambiguous
- If dimensions are unclear or cut off
- If you need style preferences
- If ceiling height is not visible
- If door/window positions affect cabinetry placement

Return ONLY valid JSON with this structure:
{
  "rooms": [...],
  "total_bedrooms": number,
  "total_bathrooms": number,
  "layout_type": "string",
  "floor_level": "string",
  "questions_for_user": [...],
  "woodwork_opportunities": [...],
  "summary": "string"
}"""

# Chat session storage (in production, use Redis or database)
chat_sessions: Dict[str, List[Dict]] = {}

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
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
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
        
        # Get language instruction
        language_instruction = get_language_instruction(request.language or "pt")
        
        # Get user description if provided
        user_context = ""
        if request.input.userDescription and request.input.userDescription.strip():
            user_context_labels = {
                "pt": "CONTEXTO ADICIONAL DO USUÁRIO",
                "en": "ADDITIONAL USER CONTEXT",
                "es": "CONTEXTO ADICIONAL DEL USUARIO"
            }
            label = user_context_labels.get(request.language or "pt", user_context_labels["pt"])
            user_context = f"\n\n{label}: {request.input.userDescription}"
        
        # Language-specific prompts
        image_prompts = {
            "pt": "Analise esta foto do ambiente. Identifique o tipo de cômodo, estime a largura da parede principal baseando-se em objetos padrão (portas, tomadas), descreva os materiais existentes e sugira um estilo SOMA-ID que combine.",
            "en": "Analyze this room photo. Identify the room type, estimate the main wall width based on standard objects (doors, outlets), describe existing materials and suggest a matching SOMA-ID style.",
            "es": "Analice esta foto del ambiente. Identifique el tipo de habitación, estime el ancho de la pared principal basándose en objetos estándar (puertas, enchufes), describa los materiales existentes y sugiera un estilo SOMA-ID que combine."
        }
        
        audio_prompts = {
            "pt": "Analise este documento/áudio. Extraia informações sobre o cliente, tipo de ambiente, medidas mencionadas e preferências de estilo.",
            "en": "Analyze this document/audio. Extract information about the client, room type, mentioned measurements and style preferences.",
            "es": "Analice este documento/audio. Extraiga información sobre el cliente, tipo de ambiente, medidas mencionadas y preferencias de estilo."
        }
        
        parts = []
        lang = request.language or "pt"
        
        if request.input.type == 'TEXT':
            parts.append(request.input.content)
        elif request.input.type == 'IMAGE':
            # Decode base64 image
            image_data = base64.b64decode(request.input.content)
            parts.append({
                "mime_type": request.input.mimeType or "image/jpeg",
                "data": image_data
            })
            parts.append(image_prompts.get(lang, image_prompts["pt"]) + user_context)
        else:
            # For audio/pdf
            file_data = base64.b64decode(request.input.content)
            parts.append({
                "mime_type": request.input.mimeType,
                "data": file_data
            })
            parts.append(audio_prompts.get(lang, audio_prompts["pt"]) + user_context)

        # Build the prompt with system instruction and language requirement
        full_prompt = f"""{SYSTEM_INSTRUCTION_DEBURADOR}

{language_instruction}

Analyze the following and return a JSON with these fields: clientName (string), roomType (string), wallWidth (number in mm), wallHeight (number in mm), wallDepth (number in mm), styleDescription (string), technicalBriefing (string), suggestedMaterials (array of strings), installationType (PISO or SUSPENSO), analysisStatus (COMPLETO or INCOMPLETO).
{user_context}
"""
        
        if request.input.type == 'TEXT':
            response = model.generate_content(full_prompt + request.input.content)
        else:
            response = model.generate_content([full_prompt] + parts)
        
        result = extract_json(response.text)
        
        # Ensure required fields with language-appropriate defaults
        default_room_types = {"pt": "Cozinha", "en": "Kitchen", "es": "Cocina"}
        default_client = {"pt": "Cliente", "en": "Client", "es": "Cliente"}
        
        result.setdefault('clientName', default_client.get(lang, 'Cliente'))
        result.setdefault('roomType', default_room_types.get(lang, 'Cozinha'))
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
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        
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
    """Generate an architectural visualization image using Gemini Nano Banana via Emergent Integration"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured for image generation")
    
    try:
        logger.info(f"Starting image generation with prompt: {request.prompt[:100]}...")
        
        # Build the detailed image generation prompt
        material_instruction = ""
        if request.materialPhoto:
            material_instruction = "Use warm wood tones with natural grain patterns similar to walnut or oak."
        else:
            material_instruction = "Use high-end natural oak/walnut textures with deep grains and matte finish."
        
        image_prompt = f"""Generate a photorealistic architectural interior render:

SCENE: {request.prompt}

STYLE REQUIREMENTS:
- Ultra-realistic 4K quality architectural photography
- Professional interior design magazine quality
- Soft natural lighting with warm accents
- Clean minimalist luxury aesthetic 2025
- {material_instruction}

CAMERA: Wide angle lens, eye-level perspective, professional composition
MOOD: Sophisticated, inviting, luxurious
QUALITY: Photorealistic, high detail, no artifacts"""

        # Use Emergent Integration for image generation with Gemini Nano Banana
        import uuid
        session_id = str(uuid.uuid4())
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY, 
            session_id=session_id, 
            system_message="You are an expert architectural visualization AI that creates stunning photorealistic interior renders."
        )
        chat.with_model("gemini", "gemini-3-pro-image-preview").with_params(modalities=["image", "text"])
        
        # Create the message
        msg = UserMessage(text=image_prompt)
        
        # Generate the image
        logger.info("Calling Gemini Nano Banana for image generation...")
        text_response, images = await chat.send_message_multimodal_response(msg)
        
        if images and len(images) > 0:
            # Successfully generated image
            img = images[0]
            image_base64 = img['data']
            mime_type = img.get('mime_type', 'image/png')
            
            logger.info(f"Image generated successfully. MIME type: {mime_type}, data starts with: {image_base64[:50] if image_base64 else 'empty'}...")
            
            return {
                "status": "success",
                "data": {
                    "image": f"data:{mime_type};base64,{image_base64}",
                    "description": text_response or "Architectural render generated successfully",
                    "generated": True
                }
            }
        else:
            # No image generated, return text response
            logger.warning("No image generated, returning text description")
            return {
                "status": "success",
                "data": {
                    "description": text_response or image_prompt,
                    "generated": False,
                    "note": "Image generation returned text description instead of image"
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


# ============== IMPORT BRIEFING FROM URL ENDPOINT ==============

BRIEFING_EXTRACTION_PROMPT = """You are an expert at extracting cabinetry/woodworking project specifications from documents.

Analyze the provided document (image or text) and extract ALL cabinetry project information.

Return a JSON object with this EXACT structure:
{
  "clientName": "extracted client name or empty string",
  "projectAddress": "extracted address or empty string",
  "areas": [
    {
      "name": "Kitchen" or "Laundry" or "Master Bath Vanity" or other room name,
      "style": "european_flat" or "european_shaker" or "traditional" or "modern" or "rustic",
      "doorType": "flat" or "shaker" or "raised_panel" or "glass" or "louvered",
      "boxMaterial": "plywood_3_4" or "plywood_1_2" or "mdf" or "particle_board",
      "doorMaterial": "mdf_3_4" or "particle_board" or "solid_wood" or "plywood_veneer",
      "finish": "wood_textured" or "super_matte" or "high_gloss" or "satin" or "lacquered" or "painted",
      "hinges": "blum_soft" or "grass_soft" or "standard" or "push_open",
      "slides": "blum_undermount" or "grass_undermount" or "side_mount" or "full_extension",
      "dimensions": "e.g., L-shape 6'x6' or Linear 12'",
      "components": ["Refrigerator Panel", "Double Oven Tall Cabinet", etc.],
      "notes": "any specific notes for this area"
    }
  ],
  "includedItems": ["Material", "Fabrication", "Assembly", "Installation", etc.],
  "excludedItems": ["Handles/Pulls", "Countertops", "Accessories", etc.],
  "generalNotes": "any general project notes"
}

IMPORTANT MAPPINGS:
- "Custom European style cabinets - Flat doors" → style: "european_flat", doorType: "flat"
- "3/4 plywood boxes" → boxMaterial: "plywood_3_4"
- "3/4 finish doors on MDF" → doorMaterial: "mdf_3_4"
- "wood textured" → finish: "wood_textured"
- "super matte" → finish: "super_matte"
- "high glossy" → finish: "high_gloss"
- "Blum soft close hinges" → hinges: "blum_soft"
- "Blum soft close undermount slides" → slides: "blum_undermount"

Common components to look for:
- Refrigerator Panel
- Double Oven Tall Cabinet
- Single Oven Cabinet
- Double Trash Pull Out
- Single Trash Pull Out
- Spice Pull Out
- Corner Lazy Susan
- Magic Corner
- Island
- Peninsula
- Wine Rack
- Glass Display Cabinet

Extract as much information as possible. If something is not explicitly stated, use reasonable defaults based on the document context.
Return ONLY valid JSON, no markdown formatting."""

@api_router.post("/briefing/import-from-url")
async def import_briefing_from_url(request: ImportBriefingRequest):
    """Import and extract briefing data from multiple shared document URLs (Adobe Acrobat, Google Drive, etc.)"""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    # Filter empty URLs
    urls = [url.strip() for url in request.urls if url.strip()]
    if not urls:
        raise HTTPException(status_code=400, detail="No valid URLs provided")
    
    logger.info(f"Importing briefing from {len(urls)} URL(s)")
    
    async def fetch_document_from_url(url: str, client: httpx.AsyncClient) -> tuple:
        """Fetch a single document from URL and return (image_data, content_type, url)"""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        try:
            # First, try to get the page
            response = await client.get(url, headers=headers)
            page_content = response.text
            
            # Parse the page to find rendition/image URLs
            soup = BeautifulSoup(page_content, 'html.parser')
            
            image_url = None
            
            # Look for Adobe Acrobat rendition URLs
            og_image = soup.find('meta', property='og:image')
            if og_image and og_image.get('content'):
                image_url = og_image['content']
            
            if not image_url:
                cdn_pattern = r'https://cdn-sharing\.adobecc\.com/rendition/[^"\'>\s]+'
                cdn_matches = re.findall(cdn_pattern, page_content)
                if cdn_matches:
                    image_url = cdn_matches[0]
            
            if not image_url:
                for img in soup.find_all('img'):
                    src = img.get('src', '')
                    if 'rendition' in src.lower() or 'cdn' in src.lower():
                        image_url = src
                        break
            
            if not image_url:
                for script in soup.find_all('script'):
                    script_text = script.string or ''
                    if 'rendition' in script_text.lower():
                        rendition_match = re.search(r'"renditionUrl"\s*:\s*"([^"]+)"', script_text)
                        if rendition_match:
                            image_url = rendition_match.group(1)
                            break
                        asset_match = re.search(r'"assetURLs"\s*:\s*\{[^}]*"rendition"\s*:\s*"([^"]+)"', script_text)
                        if asset_match:
                            image_url = asset_match.group(1)
                            break
            
            if not image_url:
                if any(ext in url.lower() for ext in ['.jpg', '.jpeg', '.png', '.pdf']):
                    image_url = url
                else:
                    return None, None, url
            
            # Fetch the actual image/document
            img_response = await client.get(image_url, headers=headers)
            if img_response.status_code != 200:
                return None, None, url
            
            image_data = img_response.content
            content_type = img_response.headers.get('content-type', 'image/jpeg')
            
            logger.info(f"Fetched document from {url[:50]}...: {len(image_data)} bytes")
            return image_data, content_type, url
            
        except Exception as e:
            logger.error(f"Error fetching {url}: {str(e)}")
            return None, None, url
    
    try:
        # Fetch all documents in parallel
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            tasks = [fetch_document_from_url(url, client) for url in urls]
            results = await asyncio.gather(*tasks)
        
        # Filter successful fetches
        documents = [(data, ctype, url) for data, ctype, url in results if data is not None]
        
        if not documents:
            raise HTTPException(status_code=400, detail="Could not fetch any documents from the provided URLs")
        
        logger.info(f"Successfully fetched {len(documents)} of {len(urls)} documents")
        
        # Analyze all documents with Gemini
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        language_instruction = get_language_instruction(request.language or "pt")
        
        # Build content parts for all documents
        content_parts = []
        for i, (image_data, content_type, url) in enumerate(documents):
            content_parts.append({"mime_type": content_type.split(';')[0], "data": image_data})
            content_parts.append(f"[Document {i+1} of {len(documents)}]")
        
        full_prompt = f"""{BRIEFING_EXTRACTION_PROMPT}

{language_instruction}

You are analyzing {len(documents)} document(s) that together form a COMPLETE cabinetry project specification.
COMBINE all information from ALL documents into a SINGLE unified response.
Documents may contain different rooms/areas or additional details for the same project.
Merge all areas, components, and specifications into one comprehensive JSON response.

Extract ALL project details from ALL documents provided."""
        
        content_parts.append(full_prompt)
        
        response = model.generate_content(content_parts)
        
        # Extract JSON from response
        result = extract_json(response.text)
        
        # Add metadata
        result['rawExtractedText'] = response.text[:3000] if len(response.text) > 3000 else response.text
        result['documentsProcessed'] = len(documents)
        result['totalUrlsProvided'] = len(urls)
        
        # Ensure areas have all required fields with defaults
        if 'areas' in result:
            for area in result['areas']:
                area.setdefault('style', 'european_flat')
                area.setdefault('doorType', 'flat')
                area.setdefault('boxMaterial', 'plywood_3_4')
                area.setdefault('doorMaterial', 'mdf_3_4')
                area.setdefault('finish', 'wood_textured')
                area.setdefault('hinges', 'blum_soft')
                area.setdefault('slides', 'blum_undermount')
                area.setdefault('dimensions', '')
                area.setdefault('components', [])
                area.setdefault('notes', '')
        
        logger.info(f"Successfully extracted briefing data with {len(result.get('areas', []))} areas from {len(documents)} documents")
        
        return {
            "status": "success",
            "data": result,
            "source_urls": urls,
            "documents_processed": len(documents)
        }
        
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Timeout while fetching URLs")
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Error fetching URLs: {str(e)}")
    except Exception as e:
        logger.error(f"Error importing briefing from URLs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to import briefing: {str(e)}")


# ============== FLOOR PLAN ANALYSIS ENDPOINTS ==============

@api_router.post("/floorplan/analyze")
async def analyze_floor_plan(request: AnalyzeFloorPlanRequest):
    """Analyze an architectural floor plan (image or PDF) and extract rooms/woodwork opportunities"""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    try:
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        
        # Decode base64 data
        file_data = base64.b64decode(request.imageBase64)
        
        # Determine mime type - support both images and PDFs
        mime_type = request.mimeType or "image/jpeg"
        is_pdf = mime_type == "application/pdf" or mime_type.endswith("/pdf")
        
        logger.info(f"Analyzing floor plan - MIME type: {mime_type}, Is PDF: {is_pdf}, Data size: {len(file_data)} bytes")
        
        # Get language instruction
        language_instruction = get_language_instruction(request.language or "pt")
        
        # Build the analysis prompt
        file_type_instruction = "PDF document containing" if is_pdf else "image of"
        
        prompt = f"""{FLOOR_PLAN_ANALYZER_INSTRUCTION}

{language_instruction}

Analyze this {file_type_instruction} an architectural floor plan.
{f'Client Name: {request.clientName}' if request.clientName else ''}
{f'Project Context: {request.projectContext}' if request.projectContext else ''}

{"NOTE: This is a PDF file. Analyze ALL pages if there are multiple. Extract information from any page that contains floor plan details." if is_pdf else ""}

Extract ALL rooms with their:
1. Name (exactly as labeled)
2. Dimensions (convert to mm if in feet/inches)
3. Area in square feet
4. Special features (walk-in closet, ceiling type, etc.)
5. Woodwork potential (what custom furniture/cabinetry can be made)

Also identify:
- Total bedrooms and bathrooms
- Layout type (single floor, multi-level, etc.)
- Which floor this is (ground, upper, etc.)

Generate questions for the user if:
- Any room's purpose is unclear
- Dimensions are cut off or unreadable
- You need style/material preferences
- Ceiling heights are not visible

Return valid JSON only."""

        response = model.generate_content([
            {"mime_type": mime_type, "data": file_data},
            prompt
        ])
        
        result = extract_json(response.text)
        
        # Create session for follow-up chat
        session_id = str(uuid.uuid4())
        chat_sessions[session_id] = [{
            "role": "system",
            "content": f"Floor plan analysis completed. Analysis: {json.dumps(result, ensure_ascii=False)}"
        }]
        
        return {
            "status": "success",
            "sessionId": session_id,
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Error analyzing floor plan: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze floor plan: {str(e)}")


@api_router.post("/floorplan/chat")
async def floor_plan_chat(request: FloorPlanChatRequest):
    """Chat with AI about the floor plan analysis - ask questions or get clarifications"""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    try:
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        
        # Get or create session
        if request.sessionId not in chat_sessions:
            chat_sessions[request.sessionId] = []
            if request.floorPlanAnalysis:
                chat_sessions[request.sessionId].append({
                    "role": "system",
                    "content": f"Floor plan analysis context: {json.dumps(request.floorPlanAnalysis, ensure_ascii=False)}"
                })
        
        # Add user message to history
        chat_sessions[request.sessionId].append({
            "role": "user",
            "content": request.message
        })
        
        # Build context for AI
        history = chat_sessions[request.sessionId]
        context = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in history])
        
        # Get language instruction
        language_instruction = get_language_instruction(request.language or "pt")
        
        system_prompt = f"""You are the SOMA-ID Floor Plan Assistant. You help users understand their floor plan analysis and guide them to create woodworking projects.

{language_instruction}

RULES:
1. Answer questions about the floor plan analysis
2. Help clarify room dimensions and purposes
3. Suggest appropriate woodwork for each room
4. Guide users to select which room they want to work on
5. If user provides new information, update your understanding
6. Always be helpful and specific about woodworking possibilities

When user selects a room for a project, confirm:
- Room name and dimensions
- Type of woodwork they want
- Any special requirements

Return your response as JSON:
{{
  "message": "Your response text",
  "suggestedActions": ["action1", "action2"],
  "updatedAnalysis": null or {{...}} if analysis needs updating,
  "readyToCreateProject": false or {{ "roomName": "...", "woodworkType": "...", "dimensions": {{...}} }}
}}"""

        prompt = f"""{system_prompt}

CONVERSATION HISTORY:
{context}

Respond to the user's last message."""

        # Include image if provided
        parts = [prompt]
        if request.imageBase64:
            image_data = base64.b64decode(request.imageBase64)
            parts = [{"mime_type": "image/jpeg", "data": image_data}, prompt]
        
        response = model.generate_content(parts)
        result = extract_json(response.text)
        
        # Add assistant response to history
        chat_sessions[request.sessionId].append({
            "role": "assistant",
            "content": result.get("message", response.text)
        })
        
        return {
            "status": "success",
            "sessionId": request.sessionId,
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Error in floor plan chat: {str(e)}")
        # Return a simple text response if JSON parsing fails
        return {
            "status": "success",
            "sessionId": request.sessionId,
            "data": {
                "message": response.text if 'response' in locals() else str(e),
                "suggestedActions": [],
                "readyToCreateProject": False
            }
        }


@api_router.post("/floorplan/select-room")
async def select_room_for_project(request: SelectRoomForProjectRequest):
    """Select a room from the floor plan to create a SOMA-ID project"""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    try:
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        
        # Find the selected room in the analysis
        selected_room = None
        for room in request.floorPlanAnalysis.get("rooms", []):
            if room.get("name", "").lower() == request.roomName.lower():
                selected_room = room
                break
        
        if not selected_room:
            raise HTTPException(status_code=404, detail=f"Room '{request.roomName}' not found in analysis")
        
        # Get language instruction
        language_instruction = get_language_instruction(request.language or "pt")
        
        # Generate project brief for the selected room
        prompt = f"""{SYSTEM_INSTRUCTION_DEBURADOR}

{language_instruction}

Based on this floor plan room analysis, create a SOMA-ID project brief:

ROOM DATA:
- Name: {selected_room.get('name')}
- Dimensions: {selected_room.get('dimensions', 'Not specified')}
- Area: {selected_room.get('area_sqft', 'Not calculated')} sq ft
- Features: {', '.join(selected_room.get('features', []))}
- Woodwork Type Requested: {request.woodworkType}

FLOOR PLAN CONTEXT:
- Layout: {request.floorPlanAnalysis.get('layout_type', 'Unknown')}
- Floor Level: {request.floorPlanAnalysis.get('floor_level', 'Unknown')}

Generate a detailed project brief with:
1. Estimated wall width in mm (based on room dimensions)
2. Suggested room type classification for SOMA-ID
3. Style recommendations
4. Technical considerations
5. Material suggestions

Return JSON:
{{
  "clientName": "From Floor Plan",
  "roomType": "SOMA-ID classification",
  "wallWidth": number in mm,
  "wallHeight": 2700,
  "styleDescription": "recommended style",
  "technicalBriefing": "detailed brief",
  "suggestedMaterials": ["material1", "material2"],
  "installationType": "PISO or SUSPENSO",
  "analysisStatus": "COMPLETO",
  "sourceRoom": "original room name",
  "woodworkType": "type requested"
}}"""

        response = model.generate_content(prompt)
        result = extract_json(response.text)
        
        # Add source information
        result["fromFloorPlan"] = True
        result["originalRoomData"] = selected_room
        
        return {
            "status": "success",
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error selecting room: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to select room: {str(e)}")


# ============== INCLUDE ROUTER AND MIDDLEWARE ==============

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root-level health check endpoint for Kubernetes
@app.get("/health")
async def kubernetes_health_check():
    """Health check endpoint for Kubernetes probes"""
    return {"status": "healthy", "service": "soma-id-backend"}

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
