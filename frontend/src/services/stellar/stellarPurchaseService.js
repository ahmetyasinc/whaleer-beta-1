import { 
  TransactionBuilder, 
  rpc,
  xdr, 
  Address, 
  nativeToScVal,
  ScInt
} from "@stellar/stellar-sdk";
import { kit } from "@/lib/stellar-kit"; 
import { createStellarOrder, confirmStellarOrder } from "@/api/stellar/stellarMarket";

// Env değişkenleri veya varsayılanlar
const RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";

const server = new rpc.Server(RPC_URL);

/**
 * Ana Fonksiyon: Bot Satın Al / Kirala
 */
export async function processStellarPurchase({
  botId,          
  sellerAddress,  
  userAddress,    // Alıcının cüzdan adresi
  purchaseType,   // "BUY" | "RENT"
  rentDays = 0,   // Kiralama ise gün sayısı
  priceXlm        // Hesaplanan XLM fiyatı
}) {
  try {
    console.log(`🚀 Stellar ${purchaseType} Başlatılıyor... Fiyat: ${priceXlm} XLM`);

    // 1. BACKEND: Sipariş Oluştur
    const orderData = await createStellarOrder({
      bot_id: botId,
      purchase_type: purchaseType,
      rent_days: rentDays,
      price_amount: priceXlm,
      seller_address: sellerAddress 
    });

    console.log("✅ Sipariş Oluştu. Backend Verisi:", orderData);

    const contractId = orderData.contract_id;
    const nativeTokenId = orderData.token_id;
    
    // Backend stroop (10^7) cinsinden integer dönüyor
    const amountStroop = BigInt(orderData.amount_stroop); 
    const orderId = BigInt(orderData.order_id);

    // 2. STELLAR: Hesap Bilgisini Çek (Sequence Number için)
    const account = await server.getAccount(userAddress);

    // 3. SOROBAN: Parametreleri Hazırla
    // fn pay_split(buyer, seller, token, amount, order_id)
    const args = [
      new Address(userAddress).toScVal(),           // buyer
      new Address(sellerAddress).toScVal(),         // seller
      new Address(nativeTokenId).toScVal(),         // token (Native XLM Contract)
      nativeToScVal(amountStroop, { type: "i128" }), // amount
      nativeToScVal(orderId, { type: "u64" })       // order_id
    ];

    // 4. TRANSACTION: İşlemi İnşa Et
    const invokeOp = xdr.Operation.invokeHostFunction({
      hostFunction: xdr.HostFunction.hostFunctionTypeInvokeContract([
        new Address(contractId).toScAddress(),
        xdr.ScSymbol.from("pay_split"),
        xdr.ScVec.from(args)
      ]),
      auth: [] // Simülasyon sonrası dolacak
    });

    let tx = new TransactionBuilder(account, {
      fee: "100", 
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(invokeOp)
      .setTimeout(30)
      .build();

    // 5. SIMULATION: Maliyet Hesabı
    console.log("⏳ İşlem Simüle Ediliyor...");
    const simResponse = await server.simulateTransaction(tx);

    if (rpc.isSimulationError(simResponse)) {
      console.error("Simülasyon Hatası Detayı:", simResponse);
      throw new Error(`Simülasyon Hatası: Kontrat işlemi reddetti.`);
    }

    console.log("✅ Simülasyon Başarılı! Kaynaklar hesaplandı.");

    // Simülasyon verilerini (Resource Footprint + Auth) işleme ekle
    tx = rpc.assembleTransaction(tx, simResponse).build();

    // 6. SIGN: Kullanıcıya İmzalat (Freighter)
    console.log("🔐 İmza Bekleniyor...");
    const { signedTxXdr } = await kit.signTransaction(
      tx.toXDR(),
      { networkPassphrase: NETWORK_PASSPHRASE }
    );

    // 7. SUBMIT: Ağa Gönder
    console.log("🌍 Ağa Gönderiliyor...");
    const sendResponse = await server.sendTransaction(
      TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE)
    );

    if (sendResponse.status === "ERROR") {
      throw new Error(`İşlem Başarısız (RPC): ${JSON.stringify(sendResponse)}`);
    }

    const txHash = sendResponse.hash;
    console.log("🎉 İşlem Ağa Girdi! Hash:", txHash);

    // 8. CONFIRM: Backend'e Haber Ver
    console.log("📡 Backend Onayı Bekleniyor...");
    const confirmation = await confirmStellarOrder({
      order_id: orderData.order_id,
      tx_hash: txHash
    });

    return { success: true, txHash, ...confirmation };

  } catch (error) {
    console.error("Stellar Purchase Error:", error);
    throw error; 
  }
}