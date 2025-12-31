"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Send,
  CircleDollarSign,
  ShoppingCart,
  QrCode,
  User,
  ScanLine,
  LogOut,
  Mail,
  LogIn,
  CirclePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import QRCode from "qrcode";
import dynamic from "next/dynamic";

const EXPLORER_TX_BASE =
  process.env.NEXT_PUBLIC_EXPLORER_TX_BASE ||
  "https://explorer.testnet.xrplevm.org/tx/";

type ToastKind = "info" | "success" | "error";
type ToastState = {
  id: number;
  kind: ToastKind;
  message: string;
  actionLabel?: string;
  actionHref?: string;
};

/**
 * Dynamically import QR scanner (client-side only)
 */
const QrScanner = dynamic(() => import("@/components/QrScanner"), {
  ssr: false,
});

/**
 * Wallet data interface
 */
interface WalletData {
  address: string;
  email?: string; // Email is optional as MetaKeep prompts user during first connection
  lookBalance: number; // LXUSD balance
  lxusdBalance: number; // LXUSD token balance
  usdcBalance: number; // Backward compatibility
  xrplBalance: number;
  lookUsdValue: number;
}

/**
 * Main wallet page component
 */
export default function Home() {
  // Wallet state
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  // Toast state (minimalist notifications)
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Refs
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Dialog states
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [qrScanDialogOpen, setQrScanDialogOpen] = useState(false);
  const [qrScanAddressDialogOpen, setQrScanAddressDialogOpen] = useState(false);

  // Send form state
  const [recipientAddress, setRecipientAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("1.00");
  const [isSending, setIsSending] = useState(false);

  // QR code state
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const showToast = useCallback(
    (next: Omit<ToastState, "id">) => {
      setToast({ id: Date.now(), ...next });
    },
    [setToast]
  );

  useEffect(() => {
    if (!toast) return;

    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 10_000);

    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    };
  }, [toast]);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!showUserMenu) return;

    const onPointerDown = (e: PointerEvent) => {
      const root = userMenuRef.current;
      if (!root) return;
      if (e.target instanceof Node && root.contains(e.target)) return;
      setShowUserMenu(false);
    };

    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, {
        capture: true,
      } as any);
    };
  }, [showUserMenu]);

  // Toast when Receive tab opens
  useEffect(() => {
    if (!receiveDialogOpen) return;
    showToast({
      kind: "info",
      message: wallet
        ? "Copy your address"
        : "Connect your wallet to receive LXUSD.",
    });
  }, [receiveDialogOpen, wallet, showToast]);

  /**
   * Load cached wallet data from localStorage
   */
  useEffect(() => {
    const cachedWallet = localStorage.getItem("lookWalletData");
    if (cachedWallet && !isLoggedOut) {
      try {
        const walletData = JSON.parse(cachedWallet);
        setWallet(walletData);
        setIsLoading(false);
        // Always refresh balances in the background to avoid stale cached amounts.
        // Also persists the refreshed wallet back into localStorage.
        if (walletData?.address) {
          void (async () => {
            const balances = await fetchBalances(walletData.address);
            const next: WalletData = {
              ...walletData,
              xrplBalance: balances.xrplBalance,
              lxusdBalance: balances.lxusdBalance,
              usdcBalance: balances.usdcBalance,
              lookBalance: balances.lxusdBalance,
              lookUsdValue: balances.lxusdBalance,
            };
            setWallet(next);
            localStorage.setItem("lookWalletData", JSON.stringify(next));
          })();
        }
        return;
      } catch (error) {
        console.error("Failed to parse cached wallet:", error);
      }
    }

    // If no cache or logged out, initialize wallet
    if (!isLoggedOut) {
      initWallet();
    } else {
      setIsLoading(false);
    }
  }, [isLoggedOut]);

  /**
   * Fetch token balances from XRPL EVM testnet via backend proxy
   * Uses Next.js API route to avoid CORS issues and network errors
   */
  const fetchBalances = async (address: string) => {
    try {
      // Call backend API proxy to fetch balances
      const response = await fetch(`/api/balances?address=${address}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Check if request was successful
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Failed to fetch balances: ${response.statusText}`
        );
      }

      // Parse and return balance data
      const balanceData = await response.json();
      return {
        xrplBalance: balanceData.xrplBalance || 0,
        lxusdBalance: balanceData.lxusdBalance || balanceData.usdcBalance || 0,
        usdcBalance: balanceData.usdcBalance || balanceData.lxusdBalance || 0,
      };
    } catch (error) {
      // Log error for debugging
      console.error("Failed to fetch balances:", error);

      // Return zero balances on error
      return {
        xrplBalance: 0,
        usdcBalance: 0,
      };
    }
  };

  /**
   * Initialize MetaKeep SDK and fetch wallet data
   */
  const initWallet = async () => {
    try {
      // Wait for MetaKeep SDK to load
      if (typeof window.MetaKeep === "undefined") {
        setTimeout(initWallet, 100);
        return;
      }

      // Initialize MetaKeep SDK
      const sdk = new window.MetaKeep({
        appId:
          process.env.NEXT_PUBLIC_METAKEEP_APP_ID ||
          "6d8968c6-397b-4ddf-8dd7-a346324900aa",
      });

      // Get wallet address from MetaKeep
      // MetaKeep will prompt user for email/phone during first connection
      const response = await sdk.getWallet();

      if (response.status === "SUCCESS") {
        const address = response.wallet.ethAddress;

        // Fetch real balances from XRPL EVM testnet
        const balances = await fetchBalances(address);

        // Extract email from MetaKeep response or cache
        // MetaKeep doesn't return email in getWallet response, so we check multiple sources:
        // 1. Response object (checking all possible fields)
        // 2. SDK instance user property
        // 3. MetaKeep's internal storage (if accessible)
        // 4. Cached email from previous session
        let userEmail: string | undefined;

        // Check if response has user information in various possible locations
        const responseAny = response as any;
        if (responseAny.user?.email) {
          userEmail = responseAny.user.email;
        } else if (responseAny.email) {
          userEmail = responseAny.email;
        } else if (responseAny.wallet?.user?.email) {
          userEmail = responseAny.wallet.user.email;
        }

        // Try to get from SDK instance if available
        if (!userEmail) {
          const sdkAny = sdk as any;
          if (sdkAny.user?.email) {
            userEmail = sdkAny.user.email;
          } else if (sdkAny.config?.user?.email) {
            userEmail = sdkAny.config.user.email;
          }
        }

        // Check MetaKeep's internal storage (if accessible)
        if (!userEmail) {
          try {
            // MetaKeep might store user info in localStorage with their own keys
            const metakeepKeys = Object.keys(localStorage).filter(
              (key) =>
                key.toLowerCase().includes("metakeep") ||
                key.toLowerCase().includes("user")
            );
            for (const key of metakeepKeys) {
              try {
                const stored = localStorage.getItem(key);
                if (stored) {
                  const parsed = JSON.parse(stored);
                  if (
                    parsed.email &&
                    typeof parsed.email === "string" &&
                    parsed.email.includes("@")
                  ) {
                    userEmail = parsed.email;
                    break;
                  }
                }
              } catch (e) {
                // Continue checking other keys
              }
            }
          } catch (e) {
            // Ignore errors when checking MetaKeep storage
          }
        }

        // Check cached data if email not found in response or MetaKeep storage
        if (!userEmail) {
          const cachedData = localStorage.getItem("lookWalletData");
          if (cachedData) {
            try {
              const parsed = JSON.parse(cachedData);
              // Only use cached email if it's a valid email format (not a placeholder)
              if (
                parsed.email &&
                parsed.email.includes("@") &&
                !parsed.email.startsWith("User ")
              ) {
                userEmail = parsed.email;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }

        const walletData: WalletData = {
          address,
          email: userEmail, // Store email if found, otherwise undefined
          lxusdBalance: balances.lxusdBalance, // LXUSD token balance
          lookBalance: balances.lxusdBalance, // Display LXUSD
          usdcBalance: balances.usdcBalance, // Backward compatibility
          xrplBalance: balances.xrplBalance,
          lookUsdValue: balances.lxusdBalance, // 1 LXUSD = 1 USD
        };

        setWallet(walletData);
        // Cache wallet data
        localStorage.setItem("lookWalletData", JSON.stringify(walletData));
        setIsLoading(false);
      } else {
        console.error("MetaKeep wallet connection failed");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to initialize wallet:", error);
      setIsLoading(false);
    }
  };

  /**
   * Generate QR code for wallet address
   */
  useEffect(() => {
    if (wallet?.address && receiveDialogOpen) {
      QRCode.toDataURL(wallet.address, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })
        .then(setQrCodeUrl)
        .catch(console.error);
    }
  }, [wallet?.address, receiveDialogOpen]);

  /**
   * Handle send LOOK tokens with MetaKeep transaction signing
   */
  const handleSend = async () => {
    if (!wallet || !recipientAddress || !sendAmount) return;

    try {
      setIsSending(true);
      // Close the modal before invoking MetaKeep.
      // The Radix Dialog overlay can otherwise sit above the MetaKeep consent widget,
      // making the widget appear "frozen" (buttons not clickable).
      setSendDialogOpen(false);
      await new Promise((r) => setTimeout(r, 50));

      // Wait for MetaKeep SDK
      if (typeof window.MetaKeep === "undefined") {
        throw new Error("MetaKeep SDK not loaded");
      }

      // Initialize MetaKeep SDK
      const sdk = new window.MetaKeep({
        appId:
          process.env.NEXT_PUBLIC_METAKEEP_APP_ID ||
          "6d8968c6-397b-4ddf-8dd7-a346324900aa",
      });

      // Get ERC-20 transfer transaction data from API
      const transferDataResponse = await fetch("/api/token-transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: wallet.address,
          to: recipientAddress,
          amount: sendAmount,
        }),
      });

      if (!transferDataResponse.ok) {
        const errorData = await transferDataResponse.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Failed to create token transfer transaction"
        );
      }

      const transferData = await transferDataResponse.json();

      // Fetch chainId, nonce, fees and gas estimate from server (prevents chain-id mismatches)
      const paramsResponse = await fetch("/api/tx-params", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: wallet.address,
          to: transferData.transactionData.to,
          data: transferData.transactionData.data,
        }),
      });

      if (!paramsResponse.ok) {
        const errorData = await paramsResponse.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Failed to prepare transaction params"
        );
      }

      const txParams = await paramsResponse.json();

      // Create ERC-20 token transfer transaction for XRPL EVM Testnet
      const transaction = {
        type: 2,
        from: wallet.address,
        to: transferData.transactionData.to, // LXUSD contract address
        value: transferData.transactionData.value, // "0x0" for ERC-20 transfers
        nonce: txParams.nonceHex,
        data: transferData.transactionData.data, // ERC-20 transfer function call data
        gas: txParams.gas,
        maxFeePerGas: txParams.maxFeePerGas,
        maxPriorityFeePerGas: txParams.maxPriorityFeePerGas,
        chainId: txParams.chainId,
      };

      // Sign transaction using MetaKeep SDK
      const signedTx = await sdk.signTransaction(
        transaction,
        `Send ${sendAmount} LXUSD to ${recipientAddress.slice(
          0,
          6
        )}...${recipientAddress.slice(-4)}`
      );

      // Check if transaction was signed successfully.
      // MetaKeep's current EVM response shape (per docs) returns:
      // - signedRawTransaction (RLP encoded, ready for eth_sendRawTransaction)
      // - transactionHash
      if (!signedTx || signedTx.status !== "SUCCESS") {
        const status = (signedTx as any)?.status || "UNKNOWN";
        if (
          status === "USER_REQUEST_DENIED" ||
          status === "USER_CONSENT_DENIED"
        ) {
          throw new Error("User denied transaction signing");
        }
        throw new Error(`Transaction signing failed (${status})`);
      }

      const signedAny = signedTx as any;
      const signedRaw =
        signedAny.signedRawTransaction ||
        signedAny.signedTransaction ||
        signedAny.transaction?.rawTransaction ||
        signedAny.transaction?.signedTransaction ||
        signedAny.transaction?.raw;

      if (
        !signedRaw ||
        typeof signedRaw !== "string" ||
        !signedRaw.startsWith("0x")
      ) {
        throw new Error("MetaKeep did not return a signed raw transaction");
      }

      // Submit signed transaction to XRPL EVM testnet
      const submitResponse = await fetch("/api/transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signedTransaction: signedRaw,
        }),
      });

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Failed to submit transaction to network"
        );
      }

      const submitData = await submitResponse.json();
      const txHash = submitData.txHash;

      console.log("Transaction submitted successfully:", txHash);

      // Store transaction hash for UI display
      setLastTxHash(txHash);
      showToast({
        kind: "success",
        message: "Transaction submitted.",
        actionLabel: "View",
        actionHref: `${EXPLORER_TX_BASE}${txHash}`,
      });

      // Reset form
      setRecipientAddress("");
      setSendAmount("1.00");

      // Refresh wallet balances after successful transaction
      if (wallet.address) {
        const balances = await fetchBalances(wallet.address);
        setWallet((prev) => {
          if (!prev) return null;
          const next = {
            ...prev,
            xrplBalance: balances.xrplBalance,
            lxusdBalance: balances.lxusdBalance,
            usdcBalance: balances.usdcBalance,
            lookBalance: balances.lxusdBalance,
            lookUsdValue: balances.lxusdBalance,
          };
          localStorage.setItem("lookWalletData", JSON.stringify(next));
          return next;
        });
      }
    } catch (error) {
      console.error("Failed to send transaction:", error);
      showToast({
        kind: "error",
        message: `Send failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Copy wallet address to clipboard
   */
  const copyAddress = async () => {
    if (wallet?.address) {
      await navigator.clipboard.writeText(wallet.address);
      showToast({ kind: "success", message: "Address copied to clipboard." });
    }
  };

  /**
   * Handle logout - clear wallet and cache
   */
  const handleLogout = () => {
    setWallet(null);
    setShowUserMenu(false);
    setIsLoggedOut(true);
    localStorage.removeItem("lookWalletData");
  };

  /**
   * Handle login - reinitialize wallet
   */
  const handleLogin = () => {
    setIsLoggedOut(false);
    setShowUserMenu(false);
    setIsLoading(true);
    initWallet();
  };

  /**
   * Open QR scanner for receive address
   */
  const handleShowReceiveQR = () => {
    setQrScanDialogOpen(true);
  };

  /**
   * Handle QR code scan for recipient address
   */
  const handleQRCodeScan = (scannedAddress: string) => {
    setRecipientAddress(scannedAddress);
    setQrScanAddressDialogOpen(false);
  };

  // Show wallet UI directly, even when logged out

  return (
    <main className="min-h-screen wallet-background flex items-center justify-center p-4">
      <div className="w-full max-w-[440px] bg-[#141414] rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.75)] overflow-hidden">
        {/* Header */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[hsl(var(--look-yellow))] flex items-center justify-center">
              <span className="text-black font-extrabold text-lg leading-none">
                L
              </span>
            </div>
            <h1 className="text-xl font-semibold text-white">LXUSD Wallet</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-300 hover:text-white hover:bg-white/5 border border-white/10 rounded-xl"
              onClick={handleShowReceiveQR}
            >
              <QrCode className="w-5 h-5" />
            </Button>
            <div className="relative" ref={userMenuRef}>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-300 hover:text-white hover:bg-white/5 border border-white/10 rounded-xl"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <User className="w-5 h-5" />
              </Button>

              {/* User dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-[#1b1b1b] rounded-xl shadow-xl border border-white/10 z-50 overflow-hidden">
                  {wallet ? (
                    <>
                      <div className="p-4 border-b border-white/10">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">
                            {wallet.email || "Email not available"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full p-3 flex items-center gap-2 text-red-400 hover:bg-white/5 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-medium">Logout</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleLogin}
                      className="w-full p-3 flex items-center gap-2 text-[hsl(var(--look-yellow))] hover:bg-white/5 transition-colors"
                    >
                      <LogIn className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Connect Wallet
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Balance Section */}
        <div className="p-6 text-center">
          <p className="text-gray-400 text-sm mb-2">Total Balance</p>
          <h2 className="text-5xl font-bold text-white mb-3">
            ${wallet?.lookBalance.toFixed(0) || "0"}
          </h2>
          <div className="flex items-center justify-center gap-2">
            <span className="text-[hsl(var(--look-yellow))] font-semibold">
              {wallet?.lookBalance.toFixed(2) || "0.00"} LXUSD
            </span>
            <span className="text-gray-500">
              (${wallet?.lookUsdValue.toFixed(2) || "0.00"})
            </span>
          </div>
        </div>

        {/* Buy Button */}
        <div className="px-6 mb-4">
          <Button
            className="w-full bg-[hsl(var(--look-yellow))] hover:bg-[hsl(var(--look-yellow))]/90 text-black font-semibold py-5 rounded-2xl text-base"
            onClick={() => window.open("https://faucet.circle.com/", "_blank")}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            BUY $LXUSD
          </Button>
        </div>

        {/* Send & Receive Buttons */}
        <div className="px-6 mb-6 grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="bg-[#1b1b1b] border-white/10 hover:bg-white/5 text-white py-5 rounded-2xl"
            onClick={() => setSendDialogOpen(true)}
            disabled={!wallet}
          >
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
          <Button
            variant="outline"
            className="bg-[#1b1b1b] border-white/10 hover:bg-white/5 text-white py-5 rounded-2xl"
            onClick={() => setReceiveDialogOpen(true)}
            disabled={!wallet}
          >
            <CirclePlus className="w-4 h-4 mr-2" />
            Receive
          </Button>
        </div>

        {/* Your Assets Section */}
        <div className="px-6 pb-6">
          <h3 className="text-white font-semibold mb-4">Your Assets</h3>

          {/* LOOK Token */}
          <div className="bg-[#1b1b1b] rounded-2xl p-4 mb-3 flex items-center justify-between border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[hsl(var(--look-yellow))] flex items-center justify-center">
                <span className="text-black font-extrabold text-lg leading-none">
                  L
                </span>
              </div>
              <div>
                <p className="text-white font-semibold">$LXUSD</p>
                <p className="text-gray-400 text-sm">Attention Token</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-semibold">
                {wallet?.lookBalance.toFixed(2) || "0.00"}
              </p>
              <p className="text-gray-400 text-sm">
                ${wallet?.lookUsdValue.toFixed(2) || "0.00"}
              </p>
            </div>
          </div>

          {/* XRPL Token */}
          <div className="bg-[#1b1b1b] rounded-2xl p-4 mb-4 flex items-center justify-between border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">X</span>
              </div>
              <div>
                <p className="text-white font-semibold">XRPL EVM</p>
                <p className="text-gray-400 text-sm">Network Token</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-semibold">
                {wallet?.xrplBalance.toFixed(1) || "0.0"}
              </p>
              <p className="text-gray-400 text-sm">
                {wallet && wallet.xrplBalance > 0
                  ? `$${(wallet.xrplBalance * 0.5).toFixed(2)}`
                  : "$0.00"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="bg-[#1b1b1b] border-white/10 hover:bg-white/5 text-white py-5 rounded-2xl"
              onClick={() =>
                window.open("https://faucet.xrplevm.org/", "_blank")
              }
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Buy XRPL
            </Button>
            <Button
              variant="outline"
              className="bg-[#1b1b1b] border-white/10 hover:bg-white/5 text-white py-5 rounded-2xl"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
              Swap XRPL
            </Button>
          </div>
        </div>

        {/* Send Dialog */}
        <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
          <DialogContent className="bg-[#141414] border-white/10 text-white max-w-[380px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-white">
                Send LXUSD
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Button
                variant="outline"
                className="w-full bg-[#1b1b1b] border-white/10 hover:bg-white/5 text-white py-5 rounded-2xl"
                onClick={() => setQrScanAddressDialogOpen(true)}
              >
                <ScanLine className="w-5 h-5 mr-2" />
                Scan QR Code
              </Button>
              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Recipient Wallet Address
                </label>
                <Input
                  placeholder="Enter wallet address"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="bg-[#1b1b1b] border-white/10 text-white placeholder:text-gray-500 h-11 rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Amount (LXUSD)
                </label>
                <Input
                  placeholder="1.00"
                  type="number"
                  step="0.01"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  className="bg-[#1b1b1b] border-white/10 text-white placeholder:text-gray-500 h-11 text-lg font-semibold rounded-xl"
                />
              </div>
              <Button
                className="w-full bg-[hsl(var(--look-yellow))] hover:bg-[hsl(var(--look-yellow))]/90 text-black font-semibold py-5 text-base rounded-2xl"
                onClick={handleSend}
                disabled={!recipientAddress || !sendAmount || isSending}
              >
                {isSending ? "Sending..." : "Send LXUSD"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Receive Dialog */}
        <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
          <DialogContent className="bg-[#141414] border-white/10 text-white max-w-[360px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-white">
                Receive LXUSD
              </DialogTitle>
            </DialogHeader>
            {wallet ? (
              <div className="space-y-3 pt-2">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-lg">
                    {qrCodeUrl && (
                      <Image
                        src={qrCodeUrl}
                        alt="Wallet QR Code"
                        width={200}
                        height={200}
                        className="rounded"
                      />
                    )}
                  </div>
                </div>

                {/* Wallet Address */}
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-3 break-all px-2">
                    {wallet.address}
                  </p>
                  <Button
                    variant="outline"
                    className="bg-[#1b1b1b] border-white/10 hover:bg-white/5 text-white w-full rounded-2xl"
                    onClick={copyAddress}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Copy Address
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2 text-center py-8">
                <p className="text-gray-400 mb-4">
                  Please connect your wallet to receive tokens
                </p>
                <Button
                  className="bg-[hsl(var(--look-yellow))] hover:bg-[hsl(var(--look-yellow))]/90 text-black rounded-2xl"
                  onClick={() => {
                    setReceiveDialogOpen(false);
                    handleLogin();
                  }}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* QR Scanner Dialog for Wallet Address */}
        <Dialog open={qrScanDialogOpen} onOpenChange={setQrScanDialogOpen}>
          <DialogContent className="bg-[#141414] border-white/10 text-white max-w-[360px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-white">
                Your Wallet QR Code
              </DialogTitle>
            </DialogHeader>
            {wallet ? (
              <div className="space-y-4 pt-2">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-lg">
                    {qrCodeUrl && (
                      <Image
                        src={qrCodeUrl}
                        alt="Wallet QR Code"
                        width={200}
                        height={200}
                        className="rounded"
                      />
                    )}
                  </div>
                </div>

                {/* Wallet Address */}
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-3 break-all px-2">
                    {wallet.address}
                  </p>
                  <Button
                    variant="outline"
                    className="bg-[#1b1b1b] border-white/10 hover:bg-white/5 text-white w-full rounded-2xl"
                    onClick={copyAddress}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Copy Address
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2 text-center py-8">
                <p className="text-gray-400 mb-4">
                  Please connect your wallet to view QR code
                </p>
                <Button
                  className="bg-[hsl(var(--look-yellow))] hover:bg-[hsl(var(--look-yellow))]/90 text-black rounded-2xl"
                  onClick={() => {
                    setQrScanDialogOpen(false);
                    handleLogin();
                  }}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* QR Scanner Dialog for Recipient Address */}
        <Dialog
          open={qrScanAddressDialogOpen}
          onOpenChange={setQrScanAddressDialogOpen}
        >
          <DialogContent className="bg-[#141414] border-white/10 text-white max-w-[400px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-white">
                Scan Recipient QR Code
              </DialogTitle>
            </DialogHeader>
            <div className="pt-4">
              <QrScanner onScan={handleQRCodeScan} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bottom toast (outside the wallet card) */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] w-[min(520px,calc(100vw-24px))] -translate-x-1/2">
          <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0f0f0f]/95 px-4 py-3 shadow-[0_16px_60px_rgba(0,0,0,0.65)] backdrop-blur">
            <div className="min-w-0">
              <p className="text-sm text-gray-100 truncate">{toast.message}</p>
            </div>
            <div className="flex items-center gap-2">
              {toast.actionHref && toast.actionLabel && (
                <a
                  href={toast.actionHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-200 hover:text-white underline underline-offset-4 whitespace-nowrap"
                >
                  {toast.actionLabel}
                </a>
              )}
              <button
                onClick={() => setToast(null)}
                className="text-xs text-gray-400 hover:text-gray-200 whitespace-nowrap"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
