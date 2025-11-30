import os
from typing import Any, Dict
import requests
from decimal import Decimal

from stellar_sdk import (
    Keypair,
    Network,
    TransactionBuilder,
    SorobanServer,
    Server,
    scval,
)
from stellar_sdk.soroban_rpc import (
    SendTransactionResponse,
    SimulateTransactionResponse,
)


class SorobanClient:
    """
    Rust kontrattaki settle_profit fonksiyonunu çağırmak için Soroban client.

        pub fn settle_profit(env: Env, bot_id: u64, user_id: u64, profit_amount: i128)

    Not:
        - settle_profit(...) EN KÜÇÜK BİRİMDE (stroop / XLM base unit) int alır.
        - settle_profit_usd(...) ise USD alır, Coinbase XLM-USD kuruna göre
          XLM'e çevirir, sonra 10^7 ile çarpıp settle_profit'i çağırır.
    """

    # XLM için on-chain decimal sayısı
    TOKEN_DECIMALS: int = int(os.getenv("STELLAR_TOKEN_DECIMALS", "7"))

    def __init__(
        self,
        rpc_url: str | None = None,
        horizon_url: str | None = None,
        network_passphrase: str | None = None,
        contract_id: str | None = None,
        admin_secret: str | None = None,
    ) -> None:

        # Soroban RPC
        self.rpc_url = rpc_url or os.getenv(
            "STELLAR_RPC_URL",
            "https://soroban-testnet.stellar.org",
        )
        # Horizon (şu an aktif kullanmıyoruz ama dursun)
        self.horizon_url = horizon_url or os.getenv(
            "STELLAR_HORIZON_URL",
            "https://horizon-testnet.stellar.org",
        )

        # Ağ
        self.network_passphrase = network_passphrase or os.getenv(
            "STELLAR_NETWORK_PASSPHRASE",
            Network.TESTNET_NETWORK_PASSPHRASE,
        )

        # Vault kontrat ID
        self.contract_id = contract_id or os.getenv("WHALEER_VAULT_CONTRACT_ID")
        if not self.contract_id:
            raise RuntimeError("WHALEER_VAULT_CONTRACT_ID environment değişkeni eksik.")

        # Admin secret
        admin_secret = admin_secret or os.getenv("WHALEER_ADMIN_SECRET_KEY")
        if not admin_secret:
            raise RuntimeError("WHALEER_ADMIN_SECRET_KEY environment değişkeni eksik.")

        self.admin_kp = Keypair.from_secret(admin_secret)

        # Client'lar
        self.soroban_server = SorobanServer(self.rpc_url)
        self.horizon_server = Server(self.horizon_url)

    # ------------------------------------------------------------------ #
    # FİYAT & DÖNÜŞÜM HELPERS
    # ------------------------------------------------------------------ #

    def _fetch_xlm_price_usd(self) -> Decimal:
        """
        XLM-USD spot fiyatını Coinbase public API'den çeker.

        Endpoint:
            GET https://api.coinbase.com/v2/prices/XLM-USD/spot

        Dönen:
            1 XLM'in USD cinsinden fiyatı (Decimal)
        """
        url = "https://api.coinbase.com/v2/prices/XLM-USD/spot"
        resp = requests.get(url, timeout=5)
        resp.raise_for_status()

        data = resp.json()
        amount_str = data["data"]["amount"]  # örn "0.10423"
        return Decimal(amount_str)

    def _usd_to_base_units(self, amount_usd: float | Decimal) -> int:
        """
        USD cinsinden gelen kârı:
            1) Coinbase'ten XLM-USD spot fiyatını çeker (1 XLM kaç $?)
            2) USD'yi XLM'e çevirir: xlm_amount = usd / xlm_price_usd
            3) XLM'i 10^TOKEN_DECIMALS ile çarpıp en küçük birime çevirir.

        Örn:
            XLM-USD = 0.1
            75 USD → 75 / 0.1 = 750 XLM
            750 XLM → 750 * 10^7 = 7_500_000_000
        """
        usd = Decimal(str(amount_usd))

        xlm_price = self._fetch_xlm_price_usd()
        if xlm_price <= 0:
            raise ValueError("Coinbase'ten gelen XLM fiyatı geçersiz (<= 0).")

        xlm_amount = usd / xlm_price  # kaç XLM eder?
        scale = Decimal(10) ** self.TOKEN_DECIMALS

        return int((xlm_amount * scale).to_integral_value())

    # ---------------------------------------------------------------------

    def _build_settle_profit_tx(
        self,
        bot_id: int,
        user_id: int,
        profit_amount: int,
    ):
        """
        settle_profit için TransactionEnvelope inşa eder.
        profit_amount burada EN KÜÇÜK BİRİMDE int olmalıdır.
        """
        source = self.soroban_server.load_account(self.admin_kp.public_key)

        tx = (
            TransactionBuilder(
                source_account=source,
                network_passphrase=self.network_passphrase,
                base_fee=100,
            )
            .append_invoke_contract_function_op(
                contract_id=self.contract_id,
                function_name="settle_profit",
                parameters=[
                    scval.to_uint64(bot_id),
                    scval.to_uint64(user_id),
                    scval.to_int128(profit_amount),
                ],
            )
            .set_timeout(300)
            .build()
        )

        return tx

    # ---------------------------------------------------------------------

    def _submit_and_wait(self, tx) -> Dict[str, Any]:
        """
        prepare_transaction sonrası imzalanmış tx'i gönderir
        ve get_transaction ile durumunu okur.
        """
        send_resp: SendTransactionResponse = self.soroban_server.send_transaction(tx)
        tx_hash = send_resp.hash
        send_status = send_resp.status

        # Mümkünse get_transaction ile final durumu al
        try:
            tx_resp = self.soroban_server.get_transaction(tx_hash)
            return {
                "tx_hash": tx_hash,
                "status": tx_resp.status,
                "raw": tx_resp,
            }
        except Exception as e:
            # get_transaction başarısız olursa en azından send_response dön
            return {
                "tx_hash": tx_hash,
                "status": send_status,
                "raw": send_resp,
                "error": str(e),
            }

    # ---------------------------------------------------------------------
    # BASE UNIT İLE ÇAĞRI
    # ---------------------------------------------------------------------

    def settle_profit(self, bot_id: int, user_id: int, profit_amount: int):
        """
        Admin hesabı ile Rust kontrattaki settle_profit fonksiyonunu çağırır.

        profit_amount:
            - EN KÜÇÜK BİRİMDE integer olmalı (stroop/token base unit).
        """

        if profit_amount <= 0:
            raise ValueError("profit_amount > 0 olmalı.")

        # Tx inşa et
        tx = self._build_settle_profit_tx(bot_id, user_id, profit_amount)

        # --- ÖNCE SIMULATE (debug için) ---
        try:
            sim: SimulateTransactionResponse = self.soroban_server.simulate_transaction(
                tx
            )
            if sim.error:
                print("❌ Soroban SIMULATION ERROR:")
                print("   →", sim.error)
                if sim.results:
                    print("   Results:", sim.results)
                # burada raise edip prepare_transaction'a hiç gitme
                raise Exception(f"Soroban simulation failed: {sim.error}")
        except Exception as e:
            # prepare_transaction aşamasına gelmeden net hatayı görmek için
            print("❌ simulate_transaction exception:", repr(e))
            raise

        # --- FOOTPRINT / PREPARE ---
        prepared_tx = self.soroban_server.prepare_transaction(tx)

        # Admin ile imzala
        prepared_tx.sign(self.admin_kp)

        # Gönder & durumunu oku
        return self._submit_and_wait(prepared_tx)

    # ---------------------------------------------------------------------
    # USD İLE KULLANIM İÇİN CONVENIENCE METHOD
    # ---------------------------------------------------------------------

    def settle_profit_usd(self, bot_id: int, user_id: int, profit_usd: float | Decimal):
        """
        Sistemde kârı USD olarak tutuyorsun.

        Burada:
          USD → (Coinbase XLM-USD kuru ile) XLM → XLM base unit'e çevirip
          settle_profit'i çağırır.
        """
        profit_amount_units = self._usd_to_base_units(profit_usd)
        return self.settle_profit(bot_id, user_id, profit_amount_units)
