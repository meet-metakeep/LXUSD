/**
 * API route handler for submitting signed transactions to XRPL EVM testnet
 * Acts as a proxy to broadcast transactions to the network
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * XRPL EVM Testnet RPC endpoint
 */
const RPC_URL =
  process.env.XRPL_EVM_TESTNET_RPC_URL ||
  process.env.NEXT_PUBLIC_XRPL_RPC_URL ||
  "https://rpc.testnet.xrplevm.org";

/**
 * Handle POST request to submit a signed transaction
 * @param request - Next.js request object containing signed transaction
 * @returns JSON response with transaction hash
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body to get signed transaction
    const body = await request.json();
    const { signedTransaction } = body;

    // Validate signed transaction
    if (!signedTransaction) {
      return NextResponse.json(
        { error: "Signed transaction is required" },
        { status: 400 }
      );
    }

    // Submit transaction to XRPL EVM testnet using eth_sendRawTransaction
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_sendRawTransaction",
        params: [signedTransaction],
        id: 1,
      }),
    });

    // Parse response
    const data = await response.json();

    // Check for errors in response
    if (data.error) {
      return NextResponse.json(
        {
          error: "Transaction failed",
          message: data.error.message || "Unknown error",
          code: data.error.code,
          data: data.error.data,
        },
        { status: 400 }
      );
    }

    // Return transaction hash
    return NextResponse.json({
      success: true,
      txHash: data.result,
    });
  } catch (error) {
    // Log error for debugging
    console.error("Failed to submit transaction:", error);

    // Return error response
    return NextResponse.json(
      {
        error: "Failed to submit transaction",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Handle GET request to fetch transaction nonce for an address
 * @param request - Next.js request object containing address as query parameter
 * @returns JSON response with transaction count (nonce)
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

    // Fetch transaction count (nonce) using eth_getTransactionCount
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getTransactionCount",
        params: [address, "latest"],
        id: 1,
      }),
    });

    // Parse response
    const data = await response.json();

    // Check for errors
    if (data.error) {
      return NextResponse.json(
        {
          error: "Failed to fetch nonce",
          message: data.error.message || "Unknown error",
        },
        { status: 400 }
      );
    }

    // Return nonce (transaction count)
    return NextResponse.json({
      nonce: data.result,
    });
  } catch (error) {
    // Log error for debugging
    console.error("Failed to fetch nonce:", error);

    // Return error response
    return NextResponse.json(
      {
        error: "Failed to fetch nonce",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

