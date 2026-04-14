type SubscriptionRecord = {
  contract: string;
  wallet: string;
  subscribedAt: string;
};

const STORAGE_KEY = "popup_subscriptions_v1";

function readStore(): SubscriptionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SubscriptionRecord[]) : [];
  } catch {
    return [];
  }
}

function writeStore(records: SubscriptionRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function markSubscribed(wallet: string, contract: string) {
  const normalizedWallet = wallet.trim().toLowerCase();
  const normalizedContract = contract.trim().toLowerCase();
  if (!normalizedWallet || !normalizedContract) return;
  const records = readStore();
  const exists = records.some(
    (record) =>
      record.wallet === normalizedWallet && record.contract === normalizedContract
  );
  if (exists) return;
  writeStore([
    ...records,
    {
      wallet: normalizedWallet,
      contract: normalizedContract,
      subscribedAt: new Date().toISOString(),
    },
  ]);
}

export function isSubscribed(wallet: string, contract: string) {
  const normalizedWallet = wallet.trim().toLowerCase();
  const normalizedContract = contract.trim().toLowerCase();
  if (!normalizedWallet || !normalizedContract) return false;
  return readStore().some(
    (record) =>
      record.wallet === normalizedWallet && record.contract === normalizedContract
  );
}

export function getSubscriberCount(contract: string) {
  const normalizedContract = contract.trim().toLowerCase();
  if (!normalizedContract) return 0;
  return readStore().filter((record) => record.contract === normalizedContract)
    .length;
}
