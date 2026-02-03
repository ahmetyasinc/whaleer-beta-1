import os
import sys
import asyncio
import socket
import requests
import json
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from dotenv import load_dotenv

# Log file path
LOG_FILE = "log.txt"

def log_print(message=""):
    print(message)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(str(message) + "\n")
    except Exception:
        pass

def print_separator(title=""):
    sep = "\n" + "=" * 60
    if title:
        content = f"{sep}\n {title}\n" + "=" * 60
    else:
        content = sep + "\n" + "=" * 60
    log_print(content)

def box_print(label, value):
    log_print(f"{label:<25}: {value}")

def get_ip_info(hostname):
    """Resolve hostname and try to get geo/provider info."""
    try:
        ip = socket.gethostbyname(hostname)
        return ip
    except Exception as e:
        return f"Resolution Failed: {e}"

def check_my_ip_connectivity():
    """Check if local machine has IPv4/IPv6 internet access."""
    print_separator("LOCAL NETWORK CONNECTIVITY CHECK")
    
    # IPv4 Check
    try:
        ipv4 = requests.get("https://api.ipify.org?format=json", timeout=5).json().get("ip")
        box_print("My Public IPv4", ipv4)
    except Exception as e:
        box_print("My Public IPv4", "❌ Not Detected (or request failed)")

    # IPv6 Check
    try:
        # ifconfig.co usually supports ipv6
        ipv6 = requests.get("https://ifconfig.co/ip", timeout=5).text.strip()
        if ":" in ipv6:
             box_print("My Public IPv6", ipv6)
        else:
             box_print("My Public IPv6", "⚠️ Detected but looks like IPv4? " + ipv6)
    except Exception as e:
        box_print("My Public IPv6", "❌ Not Detected (Connection Timed Out or Unreachable)")

    # Provider Info (using ip-api for the detected IPv4)
    try:
        # This API is free for limited use and runs over IPv4 usually
        details = requests.get("http://ip-api.com/json/", timeout=5).json()
        box_print("ISP / Org", f"{details.get('isp')} / {details.get('org')}")
        box_print("Region", f"{details.get('country')} - {details.get('regionName')}")
    except:
        box_print("ISP Info", "Could not fetch details")

async def test_db_connection():
    print_separator("DATABASE CONNECTION DIAGNOSTICS")
    
    # 1. Load .env
    load_dotenv()
    # Also load .env.local if exists, overriding defaults
    load_dotenv(".env.local")

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        log_print("❌ DATABASE_URL is missing in .env")
        return

    # Mask password for logging
    safe_db_url = db_url.split("://")[0] + "://***@" + db_url.split("@")[-1]
    box_print("DATABASE_URL (Masked)", safe_db_url)

    # 2. Extract Hostname and Analyze
    try:
        # Basic parsing without urllib for robustness on potentially weird strings
        # postgresql://user:pass@HOST:PORT/db
        part_after_at = db_url.split("@")[-1]
        hostname = part_after_at.split(":")[0]
        if "/" in hostname: # Handle cases like postgresql://...@host/db (no port)
             hostname = hostname.split("/")[0]

        box_print("DB Hostname", hostname)
        
        # Resolve DB Host IP
        db_ip = get_ip_info(hostname)
        box_print("DB Host IP (Resolved)", db_ip)

        # Basic Geo check on DB IP
        try:
            if db_ip and not db_ip.startswith("Resolution Failed"):
                geo = requests.get(f"http://ip-api.com/json/{db_ip}", timeout=5).json()
                if geo.get("status") == "success":
                     box_print("DB Host Location", f"{geo.get('country')}, {geo.get('regionName')}, {geo.get('city')}")
                     box_print("DB Host ISP", f"{geo.get('isp')}")
                else:
                     box_print("DB Host Location", "Private IP or Not Found")
        except:
            pass

    except Exception as e:
        log_print(f"⚠️ Could not parse hostname details: {e}")

    # 3. Connection Test
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")
    
    log_print("\n[Connecting to Database...]")
    
    try:
        engine = create_async_engine(db_url, echo=False)
        async with engine.connect() as conn:
            # Simple ping
            await conn.execute(text("SELECT 1"))
            log_print("✅ CONNECTION SUCCESSFUL!")
            
            # 4. Query binance_data
            log_print("\n[Querying Latest BTCUSDT Data...]")
            
            query = text("""
                SELECT timestamp, close 
                FROM binance_data 
                WHERE coin_id = 'BTCUSDT' AND interval = '1m' 
                ORDER BY timestamp DESC 
                LIMIT 1
            """)
            
            result = await conn.execute(query)
            row = result.fetchone()
            
            if row:
                ts = row[0]
                close_price = row[1]
                log_print(f"💰 LATEST BTCUSDT CLOSE (1m): {close_price}")
                log_print(f"🕒 Timestamp: {ts}")
            else:
                log_print("⚠️ No data found for BTCUSDT 1m interval.")
                
            # Extra: Check generic database version
            version_res = await conn.execute(text("SELECT version()"))
            version_row = version_res.fetchone()
            if version_row:
                log_print(f"\nℹ️  DB Version: {version_row[0]}")

        await engine.dispose()
        
    except Exception as e:
        log_print(f"\n❌ CONNECTION FAILED: {e}")
        log_print("\nPossible Causes:")
        log_print("1. IP Restrictions: Verify your IP is allowed in Supabase/AWS Security Groups.")
        log_print("2. Incorrect Password/User: Check .env file.")
        log_print("3. IPv6 Issues: If using Supabase transaction pooler (port 6543) vs Session (5432).")
        log_print("4. VPN: If you have a VPN on, it might block the specific port or IPv6.")

if __name__ == "__main__":
    check_my_ip_connectivity()
    
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    try:
        asyncio.run(test_db_connection())
    except KeyboardInterrupt:
        log_print("\nTest cancelled.")
