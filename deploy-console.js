// Save this script and run:  npx hardhat console --network xrplEvmTestnet < deploy-console.js

const hre = require("hardhat");

async function deploy() {
  try {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying from:", deployer.address);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "XRP");
    
    const LXUSD = await hre.ethers.getContractFactory("LXUSD");
    const lxusd = await LXUSD.deploy();
    await lxusd.waitForDeployment();
    
    const address = await lxusd.getAddress();
    console.log("\n✅ LXUSD deployed to:", address);
    
    const [name, symbol, decimals] = await Promise.all([
      lxusd.name(),
      lxusd.symbol(),
      lxusd.decimals(),
    ]);
    
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Decimals:", decimals.toString());
    
    // Mint 1M tokens
    const mintAmount = hre.ethers.parseUnits("1000000", decimals);
    const mintTo = "0x4D0c5316197ccFEF319F7fddc2B8F90D3A201899";
    
    console.log("\nMinting 1,000,000 LXUSD to", mintTo);
    const tx = await lxusd.mint(mintTo, mintAmount);
    await tx.wait();
    console.log("✅ Minted!");
    
    const bal = await lxusd.balanceOf(mintTo);
    console.log("Balance:", hre.ethers.formatUnits(bal, decimals), "LXUSD");
    
    console.log("\n📱 MetaMask Import:");
    console.log("Contract:", address);
    console.log("Symbol:", symbol);
    console.log("Decimals:", decimals.toString());
    
  } catch (error) {
    console.error("Error:", error);
  }
}

deploy();

