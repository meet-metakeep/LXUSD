/**
 * API route handler for fetching XRPL EVM token balances
 * Acts as a proxy to the XRPL EVM RPC endpoint to avoid CORS issues
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * XRPL EVM Testnet RPC endpoint
 * Using official Ripple EVM testnet RPC endpoint for testnet balances
 */
const RPC_URL =
  process.env.NEXT_PUBLIC_XRPL_RPC_URL ||
  "https://rpc.testnet.xrplevm.org";

/**
 * USDC contract address on XRPL EVM testnet
 */
const USDC_CONTRACT_ADDRESS =
  "0x07865c6E87B9F70255377e024ace6630C1Eaa37F";

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
    if (!address || !address.startsWith("0x")) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    // Fetch native XRPL balance using eth_getBalance
    const xrplBalanceResponse = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [address, "latest"],
        id: 1,
      }),
    });

    // Parse XRPL balance response
    const xrplBalanceData = await xrplBalanceResponse.json();
    const xrplBalanceHex = xrplBalanceData.result || "0x0";
    const xrplBalance = parseInt(xrplBalanceHex, 16) / 1e18; // Convert from wei to XRPL

    // Prepare data for USDC balanceOf call
    // balanceOf function signature: 0x70a08231 + padded address
    const paddedAddress = address.slice(2).padStart(64, "0");
    const data = "0x70a08231" + paddedAddress;

    // Fetch USDC balance using eth_call
    const usdcBalanceResponse = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [
          {
            to: USDC_CONTRACT_ADDRESS,
            data: data,
          },
          "latest",
        ],
        id: 2,
      }),
    });

    // Parse USDC balance response
    const usdcBalanceData = await usdcBalanceResponse.json();
    const usdcBalanceHex = usdcBalanceData.result || "0x0";
    const usdcBalance = parseInt(usdcBalanceHex, 16) / 1e6; // USDC has 6 decimals

    // Return formatted balances
    return NextResponse.json({
      xrplBalance: parseFloat(xrplBalance.toFixed(3)),
      usdcBalance: parseFloat(usdcBalance.toFixed(3)),
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

