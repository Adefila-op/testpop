import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { featureCards } from "../data/mockData";
import { useCollections } from "../hooks/useCollections";
import { useDemoWallet } from "../hooks/useDemoWallet";

type TabType = "for-you" | "trending" | "following";

const navigationTabs: Array<{
  key: TabType;
  label: string;
  to: string;
}> = [
  { key: "for-you", label: "For You", to: "/discover" },
  { key: "following", label: "Following", to: "/creators" },
  { key: "trending", label: "Trending", to: "/marketplace" },
];

export function DiscoveryPage() {
  const navigate = useNavigate();
  const { isConnected, connect } = useDemoWallet();
  const { collect, isCollected } = useCollections();
  const [activeTab, setActiveTab] = useState<TabType>("for-you");
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const activeCard = featureCards[activeCardIndex];
  const likeCount = activeCard.likes + (likedIds.has(activeCard.id) ? 1 : 0);
  const isSaved = savedIds.has(activeCard.id);

  const handleNextCard = () => {
    setActiveCardIndex((prev) => (prev + 1) % featureCards.length);
  };

  const handleCollect = async (productId: string) => {
    if (isCollected(productId) || collectingId) return;
    if (!isConnected) {
      connect();
      return;
    }

    setCollectingId(productId);
    await new Promise((resolve) => setTimeout(resolve, 900));
    collect(productId);
    setCollectingId(null);
  };

  const toggleLike = (productId: string) => {
    const newLiked = new Set(likedIds);
    if (newLiked.has(productId)) {
      newLiked.delete(productId);
    } else {
      newLiked.add(productId);
    }
    setLikedIds(newLiked);
  };

  const toggleSave = (productId: string) => {
    const newSaved = new Set(savedIds);
    if (newSaved.has(productId)) {
      newSaved.delete(productId);
    } else {
      newSaved.add(productId);
    }
    setSavedIds(newSaved);
  };

  const handleTopNav = (tab: (typeof navigationTabs)[number]) => {
    setActiveTab(tab.key);
    navigate(tab.to);
  };

  return (
    <section className="screen screen--discovery-onchain">
      <div className="discovery-onchain-header">
        <div className="discovery-onchain-header__left">
          <h1 className="discovery-onchain-logo">POPUP</h1>
        </div>
        <div className="discovery-onchain-header__right">
          <button className="discovery-onchain-header__btn" type="button" title="Wallet">
            Wallet
          </button>
          <button className="discovery-onchain-header__btn" type="button" title="Notifications">
            Alerts
          </button>
        </div>
      </div>

      <div className="discovery-onchain-tabs">
        <Link to={`/creator/${activeCard.creatorId}`} className="discovery-onchain-tabs__creator">
          <span
            className="discovery-onchain-tabs__creator-avatar"
            style={{ background: activeCard.accent }}
            aria-hidden="true"
          >
            {activeCard.creator.charAt(0)}
          </span>
          <span className="discovery-onchain-tabs__creator-copy">
            <strong>{activeCard.creator}</strong>
            <span>{activeCard.handle}</span>
          </span>
        </Link>

        {navigationTabs.map((tab) => (
          <button
            key={tab.key}
            className={`discovery-onchain-tab ${activeTab === tab.key ? "discovery-onchain-tab--active" : ""}`}
            onClick={() => handleTopNav(tab)}
            type="button"
          >
            {tab.label}
          </button>
        ))}

        <button
          className="discovery-onchain-search"
          type="button"
          title="Browse creators"
          onClick={() => navigate("/creators")}
        >
          Browse
        </button>
      </div>

      <div className="discovery-onchain-featured" style={{ background: activeCard.accent }}>
        <div className="discovery-onchain-featured__badge">
          <span className="live-badge">Live now</span>
          <span className="live-counter">
            {activeCardIndex + 1} / {featureCards.length}
          </span>
        </div>

        <button
          className="discovery-onchain-featured__menu"
          type="button"
          onClick={handleNextCard}
          aria-label="Show next product"
        >
          Next
        </button>

        <div className="discovery-onchain-content">
          <h2 className="discovery-onchain-title">{activeCard.title}</h2>
          <p className="discovery-onchain-description">{activeCard.summary}</p>
        </div>

        <div className="discovery-onchain-tags">
          <span className="discovery-onchain-tag">{activeCard.type}</span>
          <span className="discovery-onchain-tag">Creator</span>
          <span className="discovery-onchain-tag">Guide</span>
          <button className="discovery-onchain-tag discovery-onchain-tag--more" type="button">
            +1
          </button>
        </div>

        <div className="discovery-onchain-stats">
          <div className="stat-item">
            <div className="stat-value">
              <span className="stat-icon">4.8</span>
            </div>
            <div className="stat-label">(120 reviews)</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-value">
              <span className="stat-icon">2.3K</span>
            </div>
            <div className="stat-label">collected</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-value">
              <span className="stat-icon">120</span>
            </div>
            <div className="stat-label">sold today</div>
          </div>
        </div>

        <div className="discovery-onchain-actions">
          <button
            className="discovery-onchain-action-btn discovery-onchain-action-btn--secondary"
            type="button"
            onClick={() => navigate(`/product/${activeCard.id}`)}
          >
            Preview
            <br />
            <span className="action-secondary">Open the product page</span>
          </button>
          <button
            className="discovery-onchain-action-btn discovery-onchain-action-btn--primary"
            onClick={() => void handleCollect(activeCard.id)}
            disabled={collectingId === activeCard.id}
            type="button"
          >
            <span className="action-eth">ETH</span>{" "}
            {collectingId === activeCard.id ? "Collecting..." : `Buy for ${activeCard.price}`}
            <br />
            <span className="action-secondary">Instant access</span>
          </button>
        </div>

        <div className="discovery-onchain-engagement">
          <button
            className="engagement-item"
            type="button"
            onClick={() => toggleLike(activeCard.id)}
          >
            <span className="engagement-count">Like {likeCount}</span>
          </button>
          <button
            className="engagement-item"
            type="button"
            onClick={() => navigate(`/product/${activeCard.id}`)}
          >
            <span className="engagement-count">Comments {activeCard.gifts}</span>
          </button>
          <button
            className="engagement-item"
            type="button"
            onClick={() => navigate(`/creator/${activeCard.creatorId}`)}
          >
            <span className="engagement-count">Creator</span>
          </button>
          <button
            className="engagement-item"
            type="button"
            onClick={() => toggleSave(activeCard.id)}
          >
            <span className="engagement-count">{isSaved ? "Saved" : "Save"}</span>
          </button>
        </div>
      </div>

      <div className="discovery-onchain-top-section">
        <div className="discovery-onchain-section-header">
          <h3>Top selling this week</h3>
          <Link to="/marketplace" className="view-all-link">
            View all
          </Link>
        </div>

        <div className="discovery-onchain-scroll">
          {featureCards.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="discovery-onchain-scroll-item"
              style={{ background: product.accent }}
            >
              <div className="scroll-item-content">
                <h4>{product.title}</h4>
                <p className="scroll-item-creator">by {product.creator.split(" ")[0]}</p>
                <p className="scroll-item-price">{product.price}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
