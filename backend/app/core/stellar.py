# app/core/stellar.py
import asyncio
from stellar_sdk import SorobanServer, soroban_rpc

SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org"
soroban_server = SorobanServer(SOROBAN_RPC_URL)


async def wait_for_tx_success(
    tx_hash: str,
    max_attempts: int = 5,
    delay_seconds: float = 1.0,
) -> soroban_rpc.GetTransactionResponse:
    """
    Soroban RPC'den tx durumunu poll eder.
    SUCCESS dönerse response'u, FAILED / NOT_FOUND için exception fırlatır.
    """
    for attempt in range(max_attempts):
        try:
            tx = soroban_server.get_transaction(tx_hash)
        except Exception as e:
            # RPC tarafında network/JSON hatası vb.
            raise RuntimeError(f"Soroban RPC error while fetching transaction: {e}")

        status = tx.status  # string veya enum, SDK versiyonuna göre

        if status == soroban_rpc.GetTransactionStatus.SUCCESS:
            return tx

        if status == soroban_rpc.GetTransactionStatus.FAILED:
            raise RuntimeError("Transaction FAILED on Soroban RPC")

        # NOT_FOUND ise:
        if attempt < max_attempts - 1:
            await asyncio.sleep(delay_seconds)

    # Buraya kadar geldiysek hâlâ NOT_FOUND
    raise RuntimeError("Transaction NOT_FOUND on Soroban RPC after polling")
