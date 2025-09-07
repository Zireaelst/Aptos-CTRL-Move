import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// Window type extension for Petra wallet
declare global {
  interface Window {
    aptos?: {
      connect(): Promise<{ address: string }>;
      account(): Promise<{ address: string }>;
      disconnect(): Promise<void>;
      signAndSubmitTransaction(transaction: TransactionPayload): Promise<{ hash: string }>;
    };
  }
}

interface TransactionPayload {
  type: string;
  function: string;
  arguments: Array<number | string>;
  type_arguments: Array<string>;
}

// Initialize Aptos client for devnet
export const aptosConfig = new AptosConfig({ 
  network: Network.DEVNET 
});

export const aptos = new Aptos(aptosConfig);

// Contract addresses (deployed on devnet)
export const PREDICTION_MARKET_ADDRESS = "0x35a304995e62d1e91e576f3d43ceeb226372dfca8f246010b519f9d549b2fc6b";

// Market interface types
export interface Market {
  id: number;
  description: string;
  end_timestamp: number;
  is_resolved: boolean;
  winning_outcome?: number;
  yes_pool: number;
  no_pool: number;
  total_volume: number;
  creator: string;
}

export interface Position {
  market_id: number;
  yes_shares: number;
  no_shares: number;
}

export interface MarketOdds {
  yes_odds: number;
  no_odds: number;
}

// Helper functions for wallet connection
export const connectWallet = async () => {
  if (typeof window !== 'undefined' && 'aptos' in window && window.aptos) {
    try {
      const response = await window.aptos.connect();
      return response.address;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  } else {
    throw new Error('Petra wallet not found');
  }
};

export const getWalletAddress = async () => {
  if (typeof window !== 'undefined' && 'aptos' in window && window.aptos) {
    try {
      const response = await window.aptos.account();
      return response.address;
    } catch {
      return null;
    }
  }
  return null;
};

export const disconnectWallet = async () => {
  if (typeof window !== 'undefined' && 'aptos' in window && window.aptos) {
    try {
      await window.aptos.disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  }
};

// Contract interaction functions
export const getAllMarkets = async (): Promise<Market[]> => {
  try {
    const response = await aptos.view({
      payload: {
        function: `${PREDICTION_MARKET_ADDRESS}::market::get_all_markets`,
        functionArguments: [],
      },
    });
    return response[0] as Market[];
  } catch (error) {
    console.error('Error fetching markets:', error);
    return [];
  }
};

export const getMarket = async (marketId: number): Promise<Market | null> => {
  try {
    const response = await aptos.view({
      payload: {
        function: `${PREDICTION_MARKET_ADDRESS}::market::get_market`,
        functionArguments: [marketId],
      },
    });
    return response[0] as Market;
  } catch (error) {
    console.error('Error fetching market:', error);
    return null;
  }
};

export const getUserPortfolio = async (userAddress: string): Promise<Position[]> => {
  try {
    const response = await aptos.view({
      payload: {
        function: `${PREDICTION_MARKET_ADDRESS}::market::get_user_portfolio`,
        functionArguments: [userAddress],
      },
    });
    return response[0] as Position[];
  } catch (error) {
    console.error('Error fetching user portfolio:', error);
    return [];
  }
};

export const getMarketOdds = async (marketId: number): Promise<MarketOdds> => {
  try {
    const response = await aptos.view({
      payload: {
        function: `${PREDICTION_MARKET_ADDRESS}::market::get_market_odds`,
        functionArguments: [marketId],
      },
    });
    return {
      yes_odds: response[0] as number,
      no_odds: response[1] as number,
    };
  } catch (error) {
    console.error('Error fetching market odds:', error);
    return { yes_odds: 50, no_odds: 50 };
  }
};

export const buyShares = async (
  marketId: number,
  outcome: number,
  amount: number
) => {
  if (typeof window === 'undefined' || !('aptos' in window) || !window.aptos) {
    throw new Error('Petra wallet not found');
  }

  const transaction = {
    type: "entry_function_payload",
    function: `${PREDICTION_MARKET_ADDRESS}::market::buy_shares`,
    arguments: [marketId, outcome, amount],
    type_arguments: [],
  };

  try {
    const aptosWallet = window.aptos;
    const response = await aptosWallet.signAndSubmitTransaction(transaction);
    await aptos.waitForTransaction({ transactionHash: response.hash });
    return response;
  } catch (error) {
    console.error('Error buying shares:', error);
    throw error;
  }
};

export const claimWinnings = async (marketId: number) => {
  if (typeof window === 'undefined' || !('aptos' in window) || !window.aptos) {
    throw new Error('Petra wallet not found');
  }

  const transaction = {
    type: "entry_function_payload",
    function: `${PREDICTION_MARKET_ADDRESS}::market::claim_winnings`,
    arguments: [marketId],
    type_arguments: [],
  };

  try {
    const aptosWallet = window.aptos;
    const response = await aptosWallet.signAndSubmitTransaction(transaction);
    await aptos.waitForTransaction({ transactionHash: response.hash });
    return response;
  } catch (error) {
    console.error('Error claiming winnings:', error);
    throw error;
  }
};

// Utility functions
export const formatAPT = (amount: number): string => {
  return (amount / 100000000).toFixed(4); // Convert from Octas to APT
};

export const parseAPT = (amount: string): number => {
  return Math.floor(parseFloat(amount) * 100000000); // Convert from APT to Octas
};

export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString();
};

export const isMarketExpired = (endTimestamp: number): boolean => {
  return Date.now() / 1000 > endTimestamp;
};
