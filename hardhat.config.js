require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.10",
  networks: {
    mumbai: {
      url: "https://rough-attentive-frost.matic-testnet.discover.quiknode.pro/7c523cf7860294ba585dad8886c68f8679bfb098/",
      accounts: [
        "9292ae47e2931b2b010bb3d33cc900f59543d5cd996108d9eef75a6ab3d6c5e0",
      ],
    },
  },
};
