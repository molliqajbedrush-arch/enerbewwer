from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import httpx
from bs4 import BeautifulSoup
import pdfplumber
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO
import re
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# OpenAI Config
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class JobUrlRequest(BaseModel):
    url: str

class JobAnalysis(BaseModel):
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    contact_person: Optional[str] = None
    requirements: List[str] = []
    tasks: List[str] = []
    company_description: Optional[str] = None
    tone: str = "formal"
    raw_text: Optional[str] = None

class ResumeData(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    education: List[str] = []
    experience: List[str] = []
    skills: List[str] = []
    raw_text: Optional[str] = None

class ApplicationCreate(BaseModel):
    job_url: str
    job_analysis: dict
    resume_data: dict
    cover_letter: str
    company_name: Optional[str] = None
    job_title: Optional[str] = None

class ApplicationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    job_url: str
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    cover_letter: str
    created_at: str

class GenerateCoverLetterRequest(BaseModel):
    job_analysis: dict
    resume_data: dict

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Benutzer nicht gefunden")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token abgelaufen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ungültiger Token")

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="E-Mail bereits registriert")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.email)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            created_at=user_doc["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
    
    token = create_token(user["id"], user["email"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        created_at=current_user["created_at"]
    )

# ============== JOB ANALYSIS ==============

@api_router.post("/analyze-job", response_model=JobAnalysis)
async def analyze_job(request: JobUrlRequest, current_user: dict = Depends(get_current_user)):
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            response = await client.get(request.url, headers=headers)
            response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        # Remove scripts and styles
        for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
            tag.decompose()
        
        text = soup.get_text(separator='\n', strip=True)
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Extract basic info
        title_tag = soup.find('title')
        title = title_tag.text.strip() if title_tag else ""
        
        # Try to find structured data
        job_title = None
        company_name = None
        
        # Common meta tags
        og_title = soup.find('meta', property='og:title')
        if og_title:
            job_title = og_title.get('content', '')
        
        og_site = soup.find('meta', property='og:site_name')
        if og_site:
            company_name = og_site.get('content', '')
        
        # JSON-LD structured data
        json_ld = soup.find('script', type='application/ld+json')
        if json_ld:
            try:
                data = json.loads(json_ld.string)
                if isinstance(data, list):
                    data = data[0]
                if data.get('@type') == 'JobPosting':
                    job_title = data.get('title', job_title)
                    if 'hiringOrganization' in data:
                        company_name = data['hiringOrganization'].get('name', company_name)
            except:
                pass
        
        # Determine tone based on content
        tone = "formal"
        creative_keywords = ['kreativ', 'design', 'marketing', 'agentur', 'startup']
        tech_keywords = ['entwickler', 'engineer', 'software', 'it', 'tech', 'programmier']
        
        text_lower = text.lower()
        if any(kw in text_lower for kw in creative_keywords):
            tone = "creative"
        elif any(kw in text_lower for kw in tech_keywords):
            tone = "technical"
        
        return JobAnalysis(
            company_name=company_name or "Unbekannt",
            job_title=job_title or title or "Unbekannt",
            tone=tone,
            raw_text=text[:8000]  # Limit text length
        )
        
    except httpx.HTTPError as e:
        logger.error(f"HTTP error fetching job URL: {e}")
        raise HTTPException(status_code=400, detail=f"Fehler beim Abrufen der URL: {str(e)}")
    except Exception as e:
        logger.error(f"Error analyzing job: {e}")
        raise HTTPException(status_code=500, detail=f"Analysefehler: {str(e)}")

# ============== PDF ANALYSIS ==============

@api_router.post("/analyze-resume", response_model=ResumeData)
async def analyze_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Nur PDF-Dateien werden akzeptiert")
    
    try:
        content = await file.read()
        pdf_buffer = BytesIO(content)
        
        text = ""
        with pdfplumber.open(pdf_buffer) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        
        # Extract common patterns
        email_pattern = r'[\w\.-]+@[\w\.-]+\.\w+'
        phone_pattern = r'[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]{7,}'
        
        emails = re.findall(email_pattern, text)
        phones = re.findall(phone_pattern, text)
        
        # Try to extract name from first lines
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        full_name = lines[0] if lines else None
        
        return ResumeData(
            full_name=full_name,
            email=emails[0] if emails else None,
            phone=phones[0] if phones else None,
            raw_text=text[:8000]
        )
        
    except Exception as e:
        logger.error(f"Error analyzing resume: {e}")
        raise HTTPException(status_code=500, detail=f"Fehler bei der PDF-Analyse: {str(e)}")

# ============== AI GENERATION ==============

@api_router.post("/generate-cover-letter")
async def generate_cover_letter(
    request: GenerateCoverLetterRequest,
    current_user: dict = Depends(get_current_user)
):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    job = request.job_analysis
    resume = request.resume_data
    
    tone_instructions = {
        "formal": "Verwende einen formellen, professionellen Ton. Sei höflich und respektvoll.",
        "creative": "Verwende einen kreativen, aber professionellen Ton. Zeige Persönlichkeit und Begeisterung.",
        "technical": "Verwende einen sachlichen, technisch präzisen Ton. Fokussiere auf Fähigkeiten und Erfahrungen."
    }
    
    tone = job.get('tone', 'formal')
    tone_instruction = tone_instructions.get(tone, tone_instructions['formal'])
    
    system_message = f"""Du bist ein professioneller Bewerbungsschreiber für den deutschen Arbeitsmarkt.
Erstelle ein überzeugendes Bewerbungsanschreiben auf Deutsch.
{tone_instruction}

Das Anschreiben soll:
- Maximal eine DIN A4 Seite lang sein
- Die Firma und Position direkt ansprechen
- Die wichtigsten Qualifikationen des Bewerbers hervorheben
- Einen starken Einstieg und Abschluss haben
- Professionell formatiert sein mit:
  - Absenderadresse oben
  - Datum
  - Empfängeradresse
  - Betreff
  - Anrede
  - Haupttext (2-3 Absätze)
  - Grußformel und Name"""
    
    job_info = f"""
STELLENINFORMATIONEN:
- Firma: {job.get('company_name', 'Unbekannt')}
- Position: {job.get('job_title', 'Unbekannt')}
- Stellenbeschreibung: {job.get('raw_text', '')[:3000]}
"""
    
    applicant_info = f"""
BEWERBERINFORMATIONEN:
- Name: {resume.get('full_name', 'Unbekannt')}
- E-Mail: {resume.get('email', '')}
- Telefon: {resume.get('phone', '')}
- Lebenslauf/Qualifikationen: {resume.get('raw_text', '')[:3000]}
"""
    
    user_prompt = f"""{job_info}

{applicant_info}

Erstelle jetzt ein professionelles Bewerbungsanschreiben auf Deutsch."""
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"cover-letter-{uuid.uuid4()}",
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        response = await chat.send_message(UserMessage(text=user_prompt))
        
        return {"cover_letter": response, "tone": tone}
        
    except Exception as e:
        logger.error(f"Error generating cover letter: {e}")
        raise HTTPException(status_code=500, detail=f"Fehler bei der Generierung: {str(e)}")

# ============== PDF GENERATION ==============

@api_router.post("/generate-pdf")
async def generate_pdf(
    request: ApplicationCreate,
    current_user: dict = Depends(get_current_user)
):
    try:
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=A4,
            leftMargin=2.5*cm,
            rightMargin=2.5*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=14,
            spaceAfter=12,
            textColor=colors.HexColor('#0f172a')
        )
        
        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['Normal'],
            fontSize=11,
            leading=16,
            spaceBefore=6,
            spaceAfter=6,
            textColor=colors.HexColor('#1e293b')
        )
        
        story = []
        
        # Cover letter content
        cover_letter = request.cover_letter
        paragraphs = cover_letter.split('\n\n')
        
        for para in paragraphs:
            if para.strip():
                # Clean the text
                clean_text = para.strip().replace('\n', '<br/>')
                p = Paragraph(clean_text, body_style)
                story.append(p)
                story.append(Spacer(1, 12))
        
        doc.build(story)
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=Bewerbung_{request.company_name or 'Dokument'}.pdf"
            }
        )
        
    except Exception as e:
        logger.error(f"Error generating PDF: {e}")
        raise HTTPException(status_code=500, detail=f"PDF-Fehler: {str(e)}")

# ============== APPLICATION STORAGE ==============

@api_router.post("/applications", response_model=ApplicationResponse)
async def save_application(
    request: ApplicationCreate,
    current_user: dict = Depends(get_current_user)
):
    app_id = str(uuid.uuid4())
    app_doc = {
        "id": app_id,
        "user_id": current_user["id"],
        "job_url": request.job_url,
        "job_analysis": request.job_analysis,
        "resume_data": request.resume_data,
        "cover_letter": request.cover_letter,
        "company_name": request.company_name,
        "job_title": request.job_title,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.applications.insert_one(app_doc)
    
    return ApplicationResponse(
        id=app_id,
        user_id=current_user["id"],
        job_url=request.job_url,
        company_name=request.company_name,
        job_title=request.job_title,
        cover_letter=request.cover_letter,
        created_at=app_doc["created_at"]
    )

@api_router.get("/applications", response_model=List[ApplicationResponse])
async def get_applications(current_user: dict = Depends(get_current_user)):
    apps = await db.applications.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return [ApplicationResponse(
        id=app["id"],
        user_id=app["user_id"],
        job_url=app["job_url"],
        company_name=app.get("company_name"),
        job_title=app.get("job_title"),
        cover_letter=app["cover_letter"],
        created_at=app["created_at"]
    ) for app in apps]

@api_router.get("/applications/{app_id}", response_model=ApplicationResponse)
async def get_application(app_id: str, current_user: dict = Depends(get_current_user)):
    app = await db.applications.find_one(
        {"id": app_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not app:
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    
    return ApplicationResponse(
        id=app["id"],
        user_id=app["user_id"],
        job_url=app["job_url"],
        company_name=app.get("company_name"),
        job_title=app.get("job_title"),
        cover_letter=app["cover_letter"],
        created_at=app["created_at"]
    )

@api_router.delete("/applications/{app_id}")
async def delete_application(app_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.applications.delete_one({"id": app_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    return {"message": "Bewerbung gelöscht"}

# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "Bewerbungsgenerator API", "status": "online"}

# Include router
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
