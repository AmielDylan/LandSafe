require('dotenv').config({ path: '../landsafe-backend/config/.env' });
const { ethers } = require('hardhat');

async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.POLYGON_TESTNET_RPC_URL
  );
  const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider);
  const balance = await provider.getBalance(wallet.address);
  
  console.log('\n🔍 Vérification pré-déploiement');
  console.log('─────────────────────────────');
  console.log('📍 Wallet:', wallet.address);
  console.log('💰 Solde:', ethers.formatEther(balance), 'POL');
  
  if (balance === 0n) {
    console.log('\n❌ Solde insuffisant !');
    console.log('👉 Obtenez du POL: https://faucet.polygon.technology/\n');
    process.exit(1);
  } else {
    const minBalance = ethers.parseEther("0.1");
    if (balance < minBalance) {
      console.log('\n⚠️  Solde faible (< 0.1 POL)');
      console.log('👉 Recommandé: obtenir plus de POL pour garantir le déploiement\n');
    } else {
      console.log('✅ Solde OK pour déploiement\n');
    }
  }
}

main().catch(console.error);

