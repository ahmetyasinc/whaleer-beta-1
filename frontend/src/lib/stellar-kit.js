// src/lib/stellar-kit.js
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID
} from '@creit.tech/stellar-wallets-kit';

// Hackathon için TESTNET kullanıyoruz
// Bu nesne "singleton" olarak çalışacak, her yerde bunu import edeceğiz.
export const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID,
  modules: allowAllModules(),
});