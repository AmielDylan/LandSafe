const hre = require("hardhat");

/**
 * Script pour vérifier l'accès aux variables d'environnement
 */
async function main() {
  console.log("🔍 Vérification des variables d'environnement\n");

  // Vérifier directement depuis process.env
  console.log("1️⃣  Variables depuis process.env:");
  console.log(`   WALLET_PRIVATE_KEY: ${process.env.WALLET_PRIVATE_KEY ? "✅ Présent (" + process.env.WALLET_PRIVATE_KEY.length + " caractères)" : "❌ Absent"}`);
  console.log(`   POLYGON_TESTNET_RPC_URL: ${process.env.POLYGON_TESTNET_RPC_URL || "❌ Absent (utilisera la valeur par défaut)"}`);
  console.log(`   POLYGONSCAN_API_KEY: ${process.env.POLYGONSCAN_API_KEY ? "✅ Présent" : "⚠️  Absent (optionnel)"}`);
  console.log("");

  // Vérifier la configuration Hardhat
  console.log("2️⃣  Configuration réseau Amoy:");
  const amoyConfig = hre.config.networks.amoy;
  if (amoyConfig) {
    console.log(`   URL: ${amoyConfig.url}`);
    console.log(`   ChainID: ${amoyConfig.chainId}`);
    console.log(`   Comptes configurés: ${amoyConfig.accounts ? amoyConfig.accounts.length : 0}`);
    
    if (amoyConfig.accounts && amoyConfig.accounts.length > 0) {
      // Afficher seulement les 10 premiers caractères pour la sécurité
      const maskedKey = amoyConfig.accounts[0].substring(0, 10) + "..." + amoyConfig.accounts[0].substring(amoyConfig.accounts[0].length - 4);
      console.log(`   Clé privée (masquée): ${maskedKey}`);
    } else {
      console.log(`   ⚠️  Aucun compte configuré - WALLET_PRIVATE_KEY n'est pas chargé`);
    }
  }
  console.log("");

  // Tester la connexion au réseau Amoy si la clé est présente
  if (amoyConfig.accounts && amoyConfig.accounts.length > 0) {
    console.log("3️⃣  Test de connexion au réseau Amoy:");
    try {
      const provider = new hre.ethers.JsonRpcProvider(amoyConfig.url);
      const [signer] = await hre.ethers.getSigners();
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);
      
      console.log(`   ✅ Connecté au réseau Amoy`);
      console.log(`   Adresse: ${address}`);
      console.log(`   Solde: ${hre.ethers.formatEther(balance)} POL`);
      
      if (balance === 0n) {
        console.log(`   ⚠️  Solde insuffisant ! Obtenez des POL sur https://faucet.polygon.technology/`);
      }
    } catch (error) {
      console.log(`   ❌ Erreur de connexion: ${error.message}`);
    }
  } else {
    console.log("3️⃣  Test de connexion au réseau Amoy:");
    console.log("   ⚠️  Impossible de tester - WALLET_PRIVATE_KEY non configuré dans hardhat.config.js");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

