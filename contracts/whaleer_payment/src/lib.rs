#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, token, symbol_short, Symbol};

// Veri Anahtarları
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin, // Platform Cüzdanı (Komisyonu alacak kişi)
}

// Event Sembolü
const EVT_PAYMENT: Symbol = symbol_short!("pay");

#[contract]
pub struct WhaleerPayment;

#[contractimpl]
impl WhaleerPayment {

    // 1. INIT: Platform cüzdanını kaydeder (Sadece 1 kere çalışır)
    pub fn init(env: Env, platform_admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &platform_admin);
    }

    // 2. PAY_SPLIT: Satın alma/Kiralama anında parayı bölüştürür
    pub fn pay_split(
        env: Env, 
        buyer: Address, 
        seller: Address, 
        token: Address, 
        amount: i128,
        order_id: u64 
    ) {
        // Alıcının onayı (imzası) şart
        buyer.require_auth();

        if amount <= 0 { panic!("Amount must be positive"); }

        // Platform adresini çek
        let platform: Address = env.storage().instance().get(&DataKey::Admin).expect("Not initialized");

        // Hesaplama: %10 Platform, %90 Satıcı
        let platform_share = (amount * 10) / 100;
        let seller_share = amount - platform_share;

        // Token İstemcisi
        let client = token::Client::new(&env, &token);

        // Transfer 1: Platforma
        if platform_share > 0 {
            client.transfer(&buyer, &platform, &platform_share);
        }

        // Transfer 2: Satıcıya
        if seller_share > 0 {
            client.transfer(&buyer, &seller, &seller_share);
        }

        // Topics: (EventAdı, Alıcı, Satıcı) -> İndekslenebilir alanlar
        // Data: (SiparişNo, ToplamTutar, PlatformPayı, SatıcıPayı, TokenAdresi)
        env.events().publish(
            (EVT_PAYMENT, buyer, seller),
            (order_id, amount, platform_share, seller_share, token)
        );
    }
}