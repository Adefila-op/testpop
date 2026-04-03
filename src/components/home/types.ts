export type HomeArtist = {
  id: string;
  wallet?: string | null;
  contractAddress?: string | null;
  subscriptionPrice?: string | number | null;
  name: string;
  avatar: string;
  tag: string;
  bio: string;
  cover: string;
  portfolio: unknown[];
};

export type HomeDrop = {
  id: string;
  contractAddress?: string | null;
  contractDropId?: number | null;
  title: string;
  artist: string;
  priceEth: string;
  image: string;
  previewUri: string;
  deliveryUri: string;
  assetType: string;
  type: "drop" | "auction" | "campaign";
  status: "live" | "draft" | "ended";
  endsIn: string;
};

export type HomeToastFn = (options: {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}) => void;

export type HomeSubscribeButtonProps = {
  artist: HomeArtist;
  isConnected: boolean;
  connectWallet: () => Promise<unknown>;
  address?: string | null;
  toast: HomeToastFn;
  className?: string;
};
