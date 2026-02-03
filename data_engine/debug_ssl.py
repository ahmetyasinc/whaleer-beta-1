import asyncio
import websockets
import ssl
import sys

async def test_connection(uri, ssl_context=None, description="Default"):
    print(f"Testing {uri} ({description})...")
    try:
        # If ssl_context is provided, pass it to ssl argument of connect
        # Note: websockets.connect takes 'ssl' argument which can be an SSLContext
        kwargs = {}
        if ssl_context:
            kwargs['ssl'] = ssl_context
            
        async with websockets.connect(uri, **kwargs) as ws:
            print(f"✅ Success connecting to {uri} ({description})")
            await ws.close()
            return True
            
    except Exception as e:
        print(f"❌ Failed connecting to {uri} ({description}): {e}")
        return False

async def main():
    print(f"Python version: {sys.version}")
    print(f"OpenSSL version: {ssl.OPENSSL_VERSION}")
    
    # Test 1: Current configuration
    uri_9443 = "wss://stream.binance.com:9443/ws"
    await test_connection(uri_9443, description="Port 9443 (Current)")
    
    # Test 2: Standard HTTPS port
    uri_443 = "wss://stream.binance.com:443/ws"
    await test_connection(uri_443, description="Port 443 (Alternative)")
    
    # Test 3: Insecure SSL Context (Debugging only)
    uri_9443 = "wss://stream.binance.com:9443/ws"
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    await test_connection(uri_9443, ssl_context=ssl_context, description="Port 9443 (No Verify)")

if __name__ == "__main__":
    if sys.platform.startswith('win'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
