import { createConnector, ProviderNotFoundError, ChainNotConfiguredError } from "@wagmi/core";
import { getAddress, numberToHex, type EIP1193Provider } from "viem";
import { connectWeb3Auth, getWeb3AuthProvider, logoutWeb3Auth } from "@/lib/web3auth";

// Stub error classes for wagmi v3 compatibility
class SwitchChainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SwitchChainError';
  }
}

class UserRejectedRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserRejectedRequestError';
  }
}

type Provider = EIP1193Provider & {
  on?: (event: string, listener: (...args: any[]) => void) => void;
  removeListener?: (event: string, listener: (...args: any[]) => void) => void;
};

export function web3AuthConnector() {
  return createConnector<Provider, { onConnect(connectInfo: { chainId: string }): void }>((config) => {
    let provider: Provider | undefined;
    let accountsChanged: ((accounts: string[]) => void) | undefined;
    let chainChanged: ((chainId: string) => void) | undefined;
    let connect: ((connectInfo: { chainId: string }) => void) | undefined;
    let disconnect: ((error?: { code?: number }) => void) | undefined;

    const getProvider = async () => {
      if (provider) return provider;
      provider = (await getWeb3AuthProvider()) as Provider | null || undefined;
      return provider;
    };

    return {
      id: "web3auth",
      name: "Web3Auth",
      type: "web3auth",
      async setup() {
        const current = await getProvider();
        if (!current?.on) return;
        if (!connect) {
          connect = this.onConnect.bind(this);
          current.on("connect", connect);
        }
      },
      async connect({ chainId } = {}) {
        provider = (await connectWeb3Auth()) as Provider;
        if (!provider) throw new ProviderNotFoundError();

        let accounts = await provider.request({ method: "eth_accounts" }).catch(() => []);
        if (!accounts?.length) {
          accounts = await provider.request({ method: "eth_requestAccounts" });
        }

        if (connect) {
          provider.removeListener?.("connect", connect);
          connect = undefined;
        }
        if (!accountsChanged) {
          accountsChanged = this.onAccountsChanged.bind(this) as typeof accountsChanged;
          provider.on?.("accountsChanged", accountsChanged as any);
        }
        if (!chainChanged) {
          chainChanged = this.onChainChanged.bind(this);
          provider.on?.("chainChanged", chainChanged);
        }
        if (!disconnect) {
          disconnect = this.onDisconnect.bind(this);
          provider.on?.("disconnect", disconnect);
        }

        let currentChainId = await this.getChainId();
        if (chainId && currentChainId !== chainId) {
          const chain = await this.switchChain({ chainId }).catch((error) => {
            if ((error as { code?: number })?.code === UserRejectedRequestError.code) throw error;
            return { id: currentChainId };
          });
          currentChainId = chain?.id ?? currentChainId;
        }

        return {
          accounts: accounts.map((address) => getAddress(address)),
          chainId: currentChainId,
        };
      },
      async disconnect() {
        const current = await getProvider();
        if (!current) throw new ProviderNotFoundError();
        if (chainChanged) {
          current.removeListener?.("chainChanged", chainChanged);
          chainChanged = undefined;
        }
        if (disconnect) {
          current.removeListener?.("disconnect", disconnect);
          disconnect = undefined;
        }
        if (!connect) {
          connect = this.onConnect.bind(this);
          current.on?.("connect", connect);
        }
        await logoutWeb3Auth();
        provider = undefined;
      },
      async getAccounts() {
        const current = await getProvider();
        if (!current) throw new ProviderNotFoundError();
        const accounts = await current.request({ method: "eth_accounts" });
        return accounts.map((address) => getAddress(address));
      },
      async getChainId() {
        const current = await getProvider();
        if (!current) throw new ProviderNotFoundError();
        const hexChainId = await current.request({ method: "eth_chainId" });
        return Number(hexChainId);
      },
      async getProvider() {
        return getProvider();
      },
      async isAuthorized() {
        try {
          const accounts = await this.getAccounts();
          return accounts.length > 0;
        } catch {
          return false;
        }
      },
      async switchChain({ addEthereumChainParameter, chainId }) {
        const current = await getProvider();
        if (!current) throw new ProviderNotFoundError();
        const chain = config.chains.find((item) => item.id === chainId);
        if (!chain) {
          throw new SwitchChainError(new ChainNotConfiguredError());
        }

        try {
          await current.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: numberToHex(chainId) }],
          });
          return chain;
        } catch (error: any) {
          if (error?.code === 4902 || error?.data?.originalError?.code === 4902) {
            const { default: blockExplorer, ...blockExplorers } = chain.blockExplorers ?? {};
            const blockExplorerUrls =
              addEthereumChainParameter?.blockExplorerUrls ||
              (blockExplorer ? [blockExplorer.url, ...Object.values(blockExplorers).map((x) => x.url)] : []);
            const rpcUrls =
              addEthereumChainParameter?.rpcUrls?.length
                ? addEthereumChainParameter.rpcUrls
                : [chain.rpcUrls.default?.http[0] ?? ""];

            await current.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: numberToHex(chainId),
                  chainName: addEthereumChainParameter?.chainName ?? chain.name,
                  nativeCurrency: addEthereumChainParameter?.nativeCurrency ?? chain.nativeCurrency,
                  rpcUrls,
                  blockExplorerUrls,
                },
              ],
            });
            return chain;
          }

          if (error?.code === UserRejectedRequestError.code) {
            throw new UserRejectedRequestError(error);
          }
          throw new SwitchChainError(error);
        }
      },
      async onAccountsChanged(accounts) {
        if (accounts.length === 0) {
          await this.onDisconnect();
        } else {
          config.emitter.emit("change", { accounts: accounts.map(getAddress) });
        }
      },
      onChainChanged(chainId) {
        config.emitter.emit("change", { chainId: Number(chainId) });
      },
      async onConnect(connectInfo) {
        const accounts = await this.getAccounts();
        if (!accounts.length) return;
        config.emitter.emit("connect", { accounts, chainId: Number(connectInfo.chainId) });
      },
      async onDisconnect(_error) {
        config.emitter.emit("disconnect");
      },
    };
  });
}
