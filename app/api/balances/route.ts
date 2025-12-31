/**
 * API route handler for fetching XRPL EVM token balances
 * Acts as a proxy to the XRPL EVM RPC endpoint to avoid CORS issues
 */

import { NextRequest, NextResponse } from "next/server";
import { Contract, JsonRpcProvider, formatEther, formatUnits, isAddress } from "ethers";

/**
 * XRPL EVM Testnet RPC endpoint.
 *
 * Best practice: prefer a server-side env var, but keep NEXT_PUBLIC fallback
 * to avoid breaking existing setups.
 */
const RPC_URL =
  process.env.XRPL_EVM_TESTNET_RPC_URL ||
  process.env.NEXT_PUBLIC_XRPL_RPC_URL ||
  "https://rpc.testnet.xrplevm.org";

/**
 * LXUSD contract address on XRPL EVM testnet.
 *
 * Defaults to the deployed address you provided; can be overridden by env.
 */
const LXUSD_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_LXUSD_CONTRACT_ADDRESS ||
  "0xE3a2798bA79a1Fe34b6ad050c7fC791E4346a6c9";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

/**
 * Handle GET request to fetch balances for a wallet address
 * @param request - Next.js request object containing wallet address as query parameter
 * @returns JSON response with XRPL and USDC balances
 */
export async function GET(request: NextRequest) {
  try {
    // Extract wallet address from query parameters
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get("address");

    // Validate address parameter
    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    if (!isAddress(LXUSD_CONTRACT_ADDRESS)) {
      return NextResponse.json(
        {
          error: "LXUSD contract address not configured",
          message:
            "Set NEXT_PUBLIC_LXUSD_CONTRACT_ADDRESS to a valid contract address.",
        },
        { status: 500 }
      );
    }

    const provider = new JsonRpcProvider(RPC_URL);
    const token = new Contract(LXUSD_CONTRACT_ADDRESS, ERC20_ABI, provider);

    const [xrplBalanceWei, balanceRaw, decimals] = await Promise.all([
      provider.getBalance(address),
      token.balanceOf(address),
      token.decimals(),
    ]);

    const xrplBalance = Number.parseFloat(Number(formatEther(xrplBalanceWei)).toFixed(3));
    const lxusdBalance = Number.parseFloat(
      Number(formatUnits(balanceRaw, decimals)).toFixed(3)
    );

    // Return formatted balances
    return NextResponse.json({
      xrplBalance,
      lxusdBalance,
      usdcBalance: lxusdBalance, // Backward compatibility
    });
  } catch (error) {
    // Log error for debugging
    console.error("Failed to fetch balances via proxy:", error);
    
    // Return error response
    return NextResponse.json(
      {
        error: "Failed to fetch balances",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

