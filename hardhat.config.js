/** @type {import("hardhat/config").HardhatUserConfig} */
const config = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    xrplEvmTestnet: {
      type: "http",
      url: process.env.XRPL_EVM_TESTNET_RPC_URL ?? "https://rpc.testnet.xrplevm.org",
      chainId: 1440002,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
};

export default config;
