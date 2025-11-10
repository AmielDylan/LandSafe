const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Déploiement du contrat DocumentCertifier sur Polygon Amoy...\n");
  
  // Récupérer le signataire
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Déploiement avec le compte:", deployer.address);
  
  // Vérifier le solde
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Solde:", hre.ethers.formatEther(balance), "POL");
  console.log("");
  
  if (balance === 0n) {
    throw new Error("❌ Solde insuffisant ! Obtenez des POL sur https://faucet.polygon.technology/");
  }
  
  // Vérifier que le solde est suffisant (au moins 0.01 POL)
  const minBalance = hre.ethers.parseEther("0.01");
  if (balance < minBalance) {
    console.warn("⚠️  Solde faible. Le déploiement peut échouer si le solde est insuffisant.");
    console.warn("   Obtenez plus de POL sur https://faucet.polygon.technology/\n");
  }
  
  // Déployer le contrat
  console.log("📦 Déploiement du contrat DocumentCertifier...");
  const DocumentCertifier = await hre.ethers.getContractFactory("DocumentCertifier");
  const contract = await DocumentCertifier.deploy();
  
  console.log("⏳ Attente de la confirmation...");
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  
  console.log("\n✅ DocumentCertifier déployé avec succès !");
  console.log("📍 Adresse du contrat:", address);
  console.log("🔍 Voir sur Amoy Explorer:", `https://amoy.polygonscan.com/address/${address}`);
  console.log("");
  
  // Sauvegarder l'adresse et les infos de déploiement
  const deploymentInfo = {
    address: address,
    network: "Polygon Amoy Testnet",
    chainId: 80002,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    transactionHash: contract.deploymentTransaction()?.hash || "N/A"
  };
  
  // Créer le dossier config s'il n'existe pas
  const configDir = path.join(__dirname, "..", "..", "landsafe-backend", "config");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  const deploymentPath = path.join(configDir, "contract-deployment.json");
  fs.writeFileSync(
    deploymentPath,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("💾 Infos de déploiement sauvegardées dans:", deploymentPath);
  
  // Extraire et sauvegarder l'ABI
  const artifact = await hre.artifacts.readArtifact("DocumentCertifier");
  const abiPath = path.join(configDir, "DocumentCertifier-ABI.json");
  fs.writeFileSync(
    abiPath,
    JSON.stringify(artifact.abi, null, 2)
  );
  
  console.log("📄 ABI sauvegardé dans:", abiPath);
  console.log("");
  
  // Instructions pour la suite
  console.log("📋 Prochaines étapes:");
  console.log("   1. Ajoutez l'adresse du contrat dans votre .env:");
  console.log(`      CONTRACT_ADDRESS=${address}`);
  console.log("");
  console.log("   2. (Optionnel) Vérifiez le contrat sur Polygonscan:");
  console.log(`      npx hardhat verify --network amoy ${address}`);
  console.log("");
  console.log("   3. L'ABI est automatiquement disponible dans:");
  console.log(`      landsafe-backend/config/DocumentCertifier-ABI.json`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Erreur lors du déploiement:");
    console.error(error);
    process.exit(1);
  });

