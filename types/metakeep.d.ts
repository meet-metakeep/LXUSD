/**
 * MetaKeep SDK type definitions
 */

declare global {
  interface Window {
    MetaKeep: typeof MetaKeep;
  }
}


/**
 * MetaKeep user configuration
 */
interface MetaKeepUser {
  email?: string;
  phone?: string;
}

/**
 * MetaKeep SDK configuration options
 */
interface MetaKeepConfigWithUser {
  appId: string;
  user?: MetaKeepUser;
}

/**
 * Wallet response from MetaKeep SDK
 */
interface MetaKeepWalletResponse {
  status: "SUCCESS" | "FAILED";
  wallet: {
    ethAddress: string;
    solAddress?: string;
    eosAddress?: string;
  };
}

/**
 * Ethereum transaction object
 */
interface EthTransaction {
  type?: number;
  from: string;
  to: string;
  value: string;
  nonce: string;
  data?: string;
  gas: number;
  maxFeePerGas?: number;
  maxPriorityFeePerGas?: number;
  chainId: number;
}

/**
 * Transaction response
 */
interface TransactionResponse {
  status: "SUCCESS" | "FAILED";
  transaction?: {
    hash: string;
    [key: string]: any;
  };
}

/**
 * MetaKeep SDK class
 */
declare class MetaKeep {
  constructor(config: MetaKeepConfigWithUser);

  /**
   * Get wallet address from MetaKeep
   * @returns Promise with wallet response
   */
  getWallet(): Promise<MetaKeepWalletResponse>;

  /**
   * Sign a transaction
   * @param transaction - Ethereum transaction object
   * @param reason - Reason for signing (shown to user)
   * @returns Promise with signed transaction
   */
  signTransaction(
    transaction: EthTransaction,
    reason: string
  ): Promise<TransactionResponse>;
}

export {
  MetaKeep,
  MetaKeepConfigWithUser,
  MetaKeepUser,
  MetaKeepWalletResponse,
  EthTransaction,
  TransactionResponse,
};

