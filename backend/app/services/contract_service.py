import os
import time
from stellar_sdk import (
    Keypair, Network, TransactionBuilder, 
    SorobanServer, scval, Asset
)
from stellar_sdk.soroban_types import ScVal

# --- KONFİGÜRASYON ---
# Bu değerleri .env dosyasından çeker, yoksa varsayılanları kullanır
STELLAR_RPC_URL = os.getenv("STELLAR_RPC_URL", "https://soroban-testnet.stellar.org")
NETWORK_PASSPHRASE = os.getenv("STELLAR_NETWORK_PASSPHRASE", "Test SDF Network ; September 2015")
ADMIN_SECRET = os.getenv("WHALEER_ADMIN_SECRET_KEY")
CONTRACT_ID = os.getenv("WHALEER_VAULT_CONTRACT_ID")
NATIVE_ASSET_ID = os.getenv("NATIVE_TOKEN_CONTRACT_ID")

# Soroban Sunucusu Başlat
server = SorobanServer(STELLAR_RPC_URL)

def get_admin_keypair() -> Keypair:
    """Admin cüzdanını yükler."""
    if not ADMIN_SECRET:
        raise Exception("WHALEER_ADMIN_SECRET_KEY is missing in .env")
    return Keypair.from_secret(ADMIN_SECRET)

def invoke_contract(function_name: str, args: list) -> str:
    """
    Genel amaçlı kontrat çağırma fonksiyonu.
    Transaction oluşturur, simüle eder, imzalar ve gönderir.
    """
    admin_kp = get_admin_keypair()
    source_account = server.load_account(admin_kp.public_key)

    # 1. İşlemi İnşa Et
    tx = (
        TransactionBuilder(
            source_account,
            NETWORK_PASSPHRASE,
            base_fee=100
        )
        .set_timeout(30)
        .append_invoke_contract_function_op(
            contract_id=CONTRACT_ID,
            function_name=function_name,
            parameters=args,
        )
        .build()
    )

    # 2. Simülasyon (Maliyet ve Yetki Hesabı)
    print(f"⏳ Simulating {function_name}...")
    sim_resp = server.simulate_transaction(tx)
    
    if "error" in sim_resp:
        raise Exception(f"Simulation Error in {function_name}: {sim_resp['error']}")

    # Simülasyon verilerini (footprint/auth) işleme ekle
    tx = server.prepare_transaction(tx, sim_resp)

    # 3. İmzala
    tx.sign(admin_kp)

    # 4. Gönder
    print(f"🚀 Submitting {function_name} to network...")
    send_resp = server.send_transaction(tx)

    if send_resp["status"] == "ERROR":
        raise Exception(f"Transaction Failed: {send_resp}")
    
    # İşlem başarılı ama henüz onaylanmamış olabilir (PENDING)
    # Hash'i döndür, isteyen bekler isteyen kaydeder.
    return send_resp["hash"]

# --- PUBLIC FONKSİYONLAR (Dışarıdan Çağrılacaklar) ---

def init_vault_on_chain(
    bot_id: int,
    user_address: str,
    developer_address: str,
    platform_address: str, # Genelde bizim PLATFORM_WALLET
    profit_share_bps: int, # Örn: 2000 (%20)
    platform_cut_bps: int = 1000 # Örn: 1000 (%10)
) -> str:
    """
    Yeni bir bot kiralandığında/satın alındığında çağrılır.
    Zincir üzerinde Vault oluşturur.
    """
    print(f"🔗 Initializing Vault for Bot {bot_id} User {user_address[:4]}...")

    # Parametreleri Soroban formatına (ScVal) çevir
    # fn init_vault(env, bot_id, user, developer, platform, asset, profit_share_bps, platform_cut_bps)
    args = [
        scval.to_uint64(bot_id),
        scval.to_address(user_address),
        scval.to_address(developer_address),
        scval.to_address(platform_address),
        scval.to_address(NATIVE_ASSET_ID), # XLM Kontrat ID'si
        scval.to_uint32(profit_share_bps),
        scval.to_uint32(platform_cut_bps),
    ]

    return invoke_contract("init_vault", args)


def settle_profit_on_chain(
    bot_id: int,
    user_address: str,
    profit_amount_token_units: int 
) -> str:
    """
    Gece yarısı PnL pozitif olduğunda çağrılır.
    Kârı dağıtır. profit_amount_token_units: XLM'in en küçük birimi (stroop) cinsinden olmalı (1 XLM = 10^7 stroop).
    """
    print(f"💰 Settling Profit for Bot {bot_id}: {profit_amount_token_units} units")

    # fn settle_profit(env, bot_id, user, profit_amount)
    args = [
        scval.to_uint64(bot_id),
        scval.to_address(user_address),
        scval.to_int128(profit_amount_token_units)
    ]

    return invoke_contract("settle_profit", args)