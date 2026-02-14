"""
MeowTool Web API - Roblox Cookie Checker / Sorter / Refresher / Proxy Checker
"""

import asyncio
import re
from typing import List, Dict, Optional
from dataclasses import dataclass

import aiohttp
from aiohttp_socks import ProxyConnector
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel, Field
import os

app = FastAPI(title="MeowTool API", version="2.3.3")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== MODELS ====================

class ProxyCheckRequest(BaseModel):
    proxies: List[str]
    timeout: int = 10

class CookieCheckRequest(BaseModel):
    cookies: List[str]
    proxy: Optional[str] = None
    timeout: int = 10

class CookieRefreshRequest(BaseModel):
    cookie: str
    proxy: Optional[str] = None

class PlaceParserRequest(BaseModel):
    place_id: int

class ProxyResult(BaseModel):
    proxy: str
    status: str
    response_time: Optional[float] = None
    error: Optional[str] = None

class RobloxAccountData(BaseModel):
    user_id: Optional[int] = None
    username: Optional[str] = None
    display_name: Optional[str] = None
    created: Optional[str] = None
    is_banned: bool = False
    robux: Optional[int] = None
    premium: bool = False
    has_pin: bool = False
    is_2fa_enabled: bool = False
    email_verified: bool = False
    can_trade: bool = False
    friends_count: Optional[int] = None
    followers_count: Optional[int] = None
    groups_count: Optional[int] = None
    error: Optional[str] = None

class CookieCheckResult(BaseModel):
    cookie: str
    valid: bool
    account: Optional[RobloxAccountData] = None
    error: Optional[str] = None

class CookieRefreshResult(BaseModel):
    old_cookie: str
    new_cookie: Optional[str] = None
    success: bool
    error: Optional[str] = None

class GamepassInfo(BaseModel):
    id: int
    name: str
    price: Optional[int] = None

class BadgeInfo(BaseModel):
    id: int
    name: str

class PlaceParseResult(BaseModel):
    place_id: int
    place_name: Optional[str] = None
    gamepasses: List[GamepassInfo] = Field(default_factory=list)
    badges: List[BadgeInfo] = Field(default_factory=list)
    error: Optional[str] = None

# ==================== ROBLOX API ====================

ROBLOX_API_BASE = "https://users.roblox.com"
ROBLOX_ECONOMY_API = "https://economy.roblox.com"
ROBLOX_ACCOUNT_API = "https://accountsettings.roblox.com"
ROBLOX_FRIENDS_API = "https://friends.roblox.com"
ROBLOX_GROUPS_API = "https://groups.roblox.com"
ROBLOX_GAMES_API = "https://games.roblox.com"
ROBLOX_BADGES_API = "https://badges.roblox.com"
ROBLOX_AUTH_API = "https://auth.roblox.com"

async def create_session(proxy: Optional[str] = None, timeout: int = 10):
    connector = None
    if proxy:
        try:
            connector = ProxyConnector.from_url(proxy)
        except Exception:
            pass
    
    return aiohttp.ClientSession(
        connector=connector,
        timeout=aiohttp.ClientTimeout(total=timeout),
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
        }
    )

def parse_cookie(cookie: str) -> Dict[str, str]:
    cookies = {}
    cookie = cookie.strip()
    
    if "_|WARNING:" in cookie:
        parts = cookie.split("_|", 2)
        if len(parts) >= 3:
            cookies[".ROBLOSECURITY"] = "_|" + parts[2]
    elif ".ROBLOSECURITY=" in cookie:
        cookies[".ROBLOSECURITY"] = cookie.split(".ROBLOSECURITY=", 1)[1].split(";", 1)[0]
    else:
        cookies[".ROBLOSECURITY"] = cookie
    
    return cookies

async def get_csrf_token(session: aiohttp.ClientSession) -> Optional[str]:
    try:
        async with session.post(f"{ROBLOX_AUTH_API}/v2/logout") as resp:
            if resp.status == 403:
                return resp.headers.get("x-csrf-token")
    except Exception:
        pass
    return None

# ==================== PROXY CHECKER ====================

@app.post("/api/proxy/check", response_model=List[ProxyResult])
async def check_proxies(request: ProxyCheckRequest):
    results = []
    
    async def check_single_proxy(proxy: str) -> ProxyResult:
        start_time = asyncio.get_event_loop().time()
        try:
            session = await create_session(proxy, request.timeout)
            async with session:
                async with session.get("https://httpbin.org/ip") as resp:
                    elapsed = asyncio.get_event_loop().time() - start_time
                    if resp.status == 200:
                        return ProxyResult(
                            proxy=proxy,
                            status="working",
                            response_time=round(elapsed, 2)
                        )
                    else:
                        return ProxyResult(
                            proxy=proxy,
                            status="failed",
                            response_time=round(elapsed, 2),
                            error=f"HTTP {resp.status}"
                        )
        except Exception as e:
            elapsed = asyncio.get_event_loop().time() - start_time
            return ProxyResult(
                proxy=proxy,
                status="failed",
                response_time=round(elapsed, 2),
                error=str(e)[:100]
            )
    
    tasks = [check_single_proxy(proxy) for proxy in request.proxies]
    results = await asyncio.gather(*tasks)
    return results

# ==================== COOKIE CHECKER ====================

async def check_roblox_cookie(cookie: str, proxy: Optional[str] = None, timeout: int = 10) -> CookieCheckResult:
    cookies = parse_cookie(cookie)
    
    try:
        session = await create_session(proxy, timeout)
        async with session:
            csrf_token = await get_csrf_token(session)
            if csrf_token:
                session.headers["x-csrf-token"] = csrf_token
            
            session.cookie_jar.update_cookies(cookies)
            
            async with session.get(f"{ROBLOX_API_BASE}/v1/users/authenticated") as resp:
                if resp.status != 200:
                    return CookieCheckResult(
                        cookie=cookie[:50] + "...", 
                        valid=False, 
                        error=f"Invalid cookie ({resp.status})"
                    )
                
                user_data = await resp.json()
                user_id = user_data.get("id")
                
                if not user_id:
                    return CookieCheckResult(
                        cookie=cookie[:50] + "...", 
                        valid=False, 
                        error="No user ID"
                    )
                
                account = RobloxAccountData(
                    user_id=user_id,
                    username=user_data.get("name"),
                    display_name=user_data.get("displayName")
                )
                
                # Get full user info
                async with session.get(f"{ROBLOX_API_BASE}/v1/users/{user_id}") as user_resp:
                    if user_resp.status == 200:
                        full_data = await user_resp.json()
                        account.created = full_data.get("created")
                
                # Get Robux
                try:
                    async with session.get(f"{ROBLOX_ECONOMY_API}/v1/user/currency") as econ_resp:
                        if econ_resp.status == 200:
                            econ_data = await econ_resp.json()
                            account.robux = econ_data.get("robux", 0)
                except Exception:
                    pass
                
                # Get email status
                try:
                    async with session.get(f"{ROBLOX_ACCOUNT_API}/v1/email") as email_resp:
                        if email_resp.status == 200:
                            email_data = await email_resp.json()
                            account.email_verified = email_data.get("verified", False)
                except Exception:
                    pass
                
                # Get 2FA status
                try:
                    async with session.get(f"{ROBLOX_ACCOUNT_API}/v1/2fa") as twofa_resp:
                        if twofa_resp.status == 200:
                            twofa_data = await twofa_resp.json()
                            account.is_2fa_enabled = twofa_data.get("enabled", False)
                except Exception:
                    pass
                
                # Get PIN status
                try:
                    async with session.get(f"{ROBLOX_ACCOUNT_API}/v1/pin") as pin_resp:
                        if pin_resp.status == 200:
                            pin_data = await pin_resp.json()
                            account.has_pin = pin_data.get("isEnabled", False)
                except Exception:
                    pass
                
                # Get premium status
                try:
                    async with session.get(f"{ROBLOX_ECONOMY_API}/v1/user/premium-membership") as prem_resp:
                        account.premium = prem_resp.status == 200
                except Exception:
                    pass
                
                # Get friends count
                try:
                    async with session.get(f"{ROBLOX_FRIENDS_API}/v1/users/{user_id}/friends/count") as friends_resp:
                        if friends_resp.status == 200:
                            friends_data = await friends_resp.json()
                            account.friends_count = friends_data.get("count", 0)
                except Exception:
                    pass
                
                # Get followers count
                try:
                    async with session.get(f"{ROBLOX_FRIENDS_API}/v1/users/{user_id}/followers/count") as followers_resp:
                        if followers_resp.status == 200:
                            followers_data = await followers_resp.json()
                            account.followers_count = followers_data.get("count", 0)
                except Exception:
                    pass
                
                # Get groups count
                try:
                    async with session.get(f"{ROBLOX_GROUPS_API}/v1/users/{user_id}/groups/roles") as groups_resp:
                        if groups_resp.status == 200:
                            groups_data = await groups_resp.json()
                            account.groups_count = len(groups_data.get("data", []))
                except Exception:
                    pass
                
                # Get trade status
                try:
                    async with session.get(f"{ROBLOX_ACCOUNT_API}/v1/trade-privacy") as trade_resp:
                        if trade_resp.status == 200:
                            trade_data = await trade_resp.json()
                            account.can_trade = trade_data.get("canTrade", False)
                except Exception:
                    pass
                
                return CookieCheckResult(
                    cookie=cookie[:50] + "...", 
                    valid=True, 
                    account=account
                )
                
    except Exception as e:
        return CookieCheckResult(
            cookie=cookie[:50] + "...", 
            valid=False, 
            error=str(e)[:100]
        )

@app.post("/api/cookie/check", response_model=List[CookieCheckResult])
async def check_cookies(request: CookieCheckRequest):
    tasks = [check_roblox_cookie(cookie, request.proxy, request.timeout) for cookie in request.cookies]
    results = await asyncio.gather(*tasks)
    return results

# ==================== COOKIE REFRESHER ====================

@app.post("/api/cookie/refresh", response_model=CookieRefreshResult)
async def refresh_cookie(request: CookieRefreshRequest):
    cookies = parse_cookie(request.cookie)
    
    try:
        session = await create_session(request.proxy, 10)
        async with session:
            csrf_token = await get_csrf_token(session)
            if csrf_token:
                session.headers["x-csrf-token"] = csrf_token
            
            session.cookie_jar.update_cookies(cookies)
            
            async with session.post(f"{ROBLOX_AUTH_API}/v2/logout") as resp:
                new_cookie = None
                for cookie in session.cookie_jar:
                    if cookie.key == ".ROBLOSECURITY":
                        new_cookie = cookie.value
                        break
                
                if new_cookie and new_cookie != cookies.get(".ROBLOSECURITY"):
                    return CookieRefreshResult(
                        old_cookie=request.cookie[:50] + "...",
                        new_cookie=new_cookie,
                        success=True
                    )
                else:
                    return CookieRefreshResult(
                        old_cookie=request.cookie[:50] + "...",
                        success=False,
                        error="Could not refresh cookie"
                    )
                    
    except Exception as e:
        return CookieRefreshResult(
            old_cookie=request.cookie[:50] + "...",
            success=False,
            error=str(e)[:100]
        )

# ==================== COOKIE SORTER ====================

@app.post("/api/cookie/sort")
async def sort_cookies(
    file: UploadFile = File(...),
    remove_duplicates: bool = Form(True)
):
    try:
        content = await file.read()
        text = content.decode('utf-8', errors='ignore')
        
        cookie_pattern = r'_[|]WARNING:[^\s]+'
        cookies = re.findall(cookie_pattern, text)
        
        raw_cookies = re.findall(r'\.ROBLOSECURITY=([^;\s]+)', text)
        cookies.extend([f".ROBLOSECURITY={c}" for c in raw_cookies])
        
        if remove_duplicates:
            cookies = list(set(cookies))
        
        return {
            "total_found": len(cookies),
            "cookies": cookies,
            "unique_count": len(cookies)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== PLACE PARSERS ====================

@app.post("/api/place/gamepasses", response_model=PlaceParseResult)
async def parse_place_gamepasses(request: PlaceParserRequest):
    result = PlaceParseResult(place_id=request.place_id)
    
    try:
        session = await create_session(None, 10)
        async with session:
            async with session.get(f"{ROBLOX_GAMES_API}/v1/games?universeIds={request.place_id}") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get("data"):
                        universe_data = data["data"][0]
                        result.place_name = universe_data.get("name")
                        universe_id = universe_data.get("id")
                        
                        async with session.get(
                            f"{ROBLOX_GAMES_API}/v1/games/{universe_id}/game-passes?limit=100"
                        ) as gp_resp:
                            if gp_resp.status == 200:
                                gp_data = await gp_resp.json()
                                for gp in gp_data.get("data", []):
                                    result.gamepasses.append(GamepassInfo(
                                        id=gp.get("id"),
                                        name=gp.get("name"),
                                        price=gp.get("price")
                                    ))
    except Exception as e:
        result.error = str(e)[:100]
    
    return result

@app.post("/api/place/badges", response_model=PlaceParseResult)
async def parse_place_badges(request: PlaceParserRequest):
    result = PlaceParseResult(place_id=request.place_id)
    
    try:
        session = await create_session(None, 10)
        async with session:
            async with session.get(f"{ROBLOX_GAMES_API}/v1/games?universeIds={request.place_id}") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get("data"):
                        result.place_name = data["data"][0].get("name")
            
            async with session.get(
                f"{ROBLOX_BADGES_API}/v1/universes/{request.place_id}/badges?limit=100"
            ) as badge_resp:
                if badge_resp.status == 200:
                    badge_data = await badge_resp.json()
                    for badge in badge_data.get("data", []):
                        result.badges.append(BadgeInfo(
                            id=badge.get("id"),
                            name=badge.get("name")
                        ))
    except Exception as e:
        result.error = str(e)[:100]
    
    return result

# ==================== HEALTH CHECK ====================

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "2.3.3"}

# ==================== STATIC FILES ====================

# Get the directory where this file is located
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BACKEND_DIR)
STATIC_DIR = os.path.join(ROOT_DIR, "static")

@app.get("/", response_class=HTMLResponse)
async def root():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r") as f:
            return f.read()
    return {"message": "MeowTool API is running"}

@app.get("/static/{path:path}")
async def static_files(path: str):
    file_path = os.path.join(STATIC_DIR, path)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found")

# ==================== MAIN ====================

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
