/**
 * API route for preparing safe transaction parameters for MetaKeep signing.
 * Fetches chainId, nonce, fee data and estimates gas from the RPC endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { JsonRpcProvider, isAddress } from "ethers";

const RPC_URL =
  process.env.XRPL_EVM_TESTNET_RPC_URL ||
  process.env.NEXT_PUBLIC_XRPL_RPC_URL ||
  "https://rpc.testnet.xrplevm.org";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from, to, data } = body as {
      from?: string;
      to?: string;
      data?: string;
    };

    if (!from || !to || !data) {
      return NextResponse.json(
        { error: "Missing required fields: from, to, data" },
        { status: 400 }
      );
    }

    if (!isAddress(from) || !isAddress(to)) {
      return NextResponse.json({ error: "Invalid address format" }, { status: 400 });
    }

    if (typeof data !== "string" || !data.startsWith("0x")) {
      return NextResponse.json({ error: "Invalid data field" }, { status: 400 });
    }

    const provider = new JsonRpcProvider(RPC_URL);

    const [network, nonce, feeData, gasEstimate] = await Promise.all([
      provider.getNetwork(),
      provider.getTransactionCount(from, "latest"),
      provider.getFeeData(),
      provider.estimateGas({
        from,
        to,
        data,
        value: 0n,
      }),
    ]);

    // Add a small buffer to avoid out-of-gas due to minor estimation variance.
    const gasBuffered = (gasEstimate * 12n) / 10n; // +20%
    const gas = Number(gasBuffered);

    // Fee data can be null on some RPCs; fallback to gasPrice when necessary.
    const gasPrice = feeData.gasPrice ?? 1_000_000_000n; // 1 gwei fallback
    const maxPriorityFeePerGas =
      feeData.maxPriorityFeePerGas ?? (gasPrice / 2n);
    const maxFeePerGas = feeData.maxFeePerGas ?? gasPrice;

    const chainId = Number(network.chainId);

    // Keep values in safe JS number range for MetaKeep.
    // These should comfortably fit for typical gwei values.
    return NextResponse.json({
      chainId,
      nonceHex: "0x" + nonce.toString(16),
      gas,
      maxFeePerGas: Number(maxFeePerGas),
      maxPriorityFeePerGas: Number(maxPriorityFeePerGas),
    });
  } catch (error) {
    console.error("Failed to prepare tx params:", error);
    return NextResponse.json(
      {
        error: "Failed to prepare tx params",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


