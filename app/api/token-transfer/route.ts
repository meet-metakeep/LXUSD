/**
 * API route handler for ERC-20 token transfers (LXUSD)
 * Handles creating transaction data for token transfers
 */

import { NextRequest, NextResponse } from "next/server";
import { Interface, isAddress, parseUnits } from "ethers";

/**
 * LXUSD contract address on XRPL EVM testnet
 */
const LXUSD_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_LXUSD_CONTRACT_ADDRESS ||
  "0xE3a2798bA79a1Fe34b6ad050c7fC791E4346a6c9";

const ERC20_IFACE = new Interface(["function transfer(address to, uint256 value)"]);

/**
 * Handle POST request to create ERC-20 transfer transaction data
 * @param request - Next.js request object containing transfer details
 * @returns JSON response with transaction data for signing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from, to, amount } = body;

    // Validate inputs
    if (!from || !to || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: from, to, amount" },
        { status: 400 }
      );
    }

    if (!isAddress(from) || !isAddress(to)) {
      return NextResponse.json(
        { error: "Invalid address format" },
        { status: 400 }
      );
    }

    if (!isAddress(LXUSD_CONTRACT_ADDRESS)) {
      return NextResponse.json(
        {
          error:
            "LXUSD contract address not configured. Please set NEXT_PUBLIC_LXUSD_CONTRACT_ADDRESS.",
        },
        { status: 500 }
      );
    }

    const amountStr = String(amount).trim();
    if (!amountStr || Number.isNaN(Number(amountStr)) || Number(amountStr) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // LXUSD is expected to be 18 decimals on this deployment.
    // If you ever deploy with different decimals, update this to fetch decimals server-side.
    const value = parseUnits(amountStr, 18);
    const data = ERC20_IFACE.encodeFunctionData("transfer", [to, value]);

    // Return transaction data (will be signed by MetaKeep)
    return NextResponse.json({
      success: true,
      transactionData: {
        to: LXUSD_CONTRACT_ADDRESS,
        data: data,
        value: "0x0", // No native token transfer, only ERC-20
      },
    });
  } catch (error) {
    console.error("Token transfer API error:", error);
    return NextResponse.json(
      {
        error: "Failed to create transfer transaction",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

