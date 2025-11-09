require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../landsafe-backend/config/.env" });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    amoy: {
      url: process.env.POLYGON_TESTNET_RPC_URL || "https://rpc-amoy.polygon.technology/",
      chainId: 80002,
      accounts: process.env.WALLET_PRIVATE_KEY ? [process.env.WALLET_PRIVATE_KEY] : [],
      gasPrice: "auto"
    }
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY || ""
  }
};

