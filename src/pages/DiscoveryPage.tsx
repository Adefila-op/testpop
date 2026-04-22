import { useState } from "react";
import { Link } from "react-router-dom";
import { featureCards } from "../data/mockData";
import { useCollections } from "../hooks/useCollections";
import { useDemoWallet } from "../hooks/useDemoWallet";

type TabType = "for-you" | "trending" | "new" | "following";

export function DiscoveryPage() {
  const { isConnected, connect } = useDemoWallet();
  const { collect, isCollected } = useCollections();
  const [activeTab, setActiveTab] = useState<TabType>("for-you");
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const activeCard = featureCards[activeCardIndex];

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

  return (
    <section className="screen screen--discovery-onchain">
      {/* Header */}
      <div className="discovery-onchain-header">
        <div className="discovery-onchain-header__left">
          <h1 className="discovery-onchain-logo">POPUP</h1>
        </div>
        <div className="discovery-onchain-header__right">
          <button className="discovery-onchain-header__btn" type="button" title="Wallet">
            👜 Wallet
          </button>
          <button className="discovery-onchain-header__btn" type="button" title="Notifications">
            🔔
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="discovery-onchain-tabs">
        {(["for-you", "trending", "new", "following"] as const).map((tab) => (
          <button
            key={tab}
            className={`discovery-onchain-tab ${activeTab === tab ? "discovery-onchain-tab--active" : ""}`}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab === "for-you"
              ? "For You"
              : tab === "trending"
                ? "Trending"
                : tab === "new"
                  ? "New"
                  : "Following"}
          </button>
        ))}
        <button className="discovery-onchain-search" type="button" title="Search">
          🔍
        </button>
      </div>

      {/* Featured Card */}
      <div className="discovery-onchain-featured" style={{ background: activeCard.accent }}>
        {/* Live Badge */}
        <div className="discovery-onchain-featured__badge">
          <span className="live-badge">● LIVE NOW</span>
          <span className="live-counter">{activeCardIndex + 1} / {featureCards.length}</span>
        </div>

        {/* Menu Button */}
        <button className="discovery-onchain-featured__menu" type="button">
          ⋯
        </button>

        {/* Creator Info */}
        <Link to={`/creator/${activeCard.creatorId}`} className="discovery-onchain-creator">
          <span
            className="discovery-onchain-creator__avatar"
            style={{ background: activeCard.accent }}
          />
          <div className="discovery-onchain-creator__info">
            <div className="discovery-onchain-creator__name">
              {activeCard.creator} <span className="verified-badge">✓</span>
            </div>
            <div className="discovery-onchain-creator__handle">{activeCard.handle}</div>
            <div className="discovery-onchain-creator__collectors">👥 2.3K collectors</div>
          </div>
        </Link>

        {/* Title & Description */}
        <div className="discovery-onchain-content">
          <h2 className="discovery-onchain-title">{activeCard.title}</h2>
          <p className="discovery-onchain-description">{activeCard.summary}</p>
        </div>

        {/* Tags */}
        <div className="discovery-onchain-tags">
          <span className="discovery-onchain-tag">{activeCard.type}</span>
          <span className="discovery-onchain-tag">Creator</span>
          <span className="discovery-onchain-tag">Guide</span>
          <button className="discovery-onchain-tag discovery-onchain-tag--more" type="button">
            +1
          </button>
        </div>

        {/* Stats */}
        <div className="discovery-onchain-stats">
          <div className="stat-item">
            <div className="stat-value">
              <span className="stat-icon">⭐</span> 4.8
            </div>
            <div className="stat-label">(120 reviews)</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-value">
              <span className="stat-icon">🛒</span> 2.3K
            </div>
            <div className="stat-label">collected</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-value">
              <span className="stat-icon">🔥</span> 120
            </div>
            <div className="stat-label">sold today</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="discovery-onchain-actions">
          <button className="discovery-onchain-action-btn discovery-onchain-action-btn--secondary" type="button">
            👁 Preview <br /> <span className="action-secondary">View sample pages</span>
          </button>
          <button
            className="discovery-onchain-action-btn discovery-onchain-action-btn--primary"
            onClick={() => void handleCollect(activeCard.id)}
            disabled={collectingId === activeCard.id}
            type="button"
          >
            <span className="action-eth">◆</span> {collectingId === activeCard.id ? "Collecting..." : `Buy for ${activeCard.price}`}
            <br />
            <span className="action-secondary">{activeCard.price === "$39.60" ? "≈ $39.60" : ""} Instant access</span>
          </button>
        </div>

        {/* Engagement Stats */}
        <div className="discovery-onchain-engagement">
          <button className="engagement-item" type="button">
            <span className="engagement-count">❤️ {activeCard.likes + (likedIds.has(activeCard.id) ? 1 : 0)}</span>
          </button>
          <button className="engagement-item" type="button">
            <span className="engagement-count">💬 {activeCard.gifts}</span>
          </button>
          <button className="engagement-item" type="button">
            <span className="engagement-count">↗️ 21</span>
          </button>
          <button className="engagement-item" type="button">
            <span className="engagement-count">🔖</span>
          </button>
        </div>
      </div>

      {/* Top Selling Section */}
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
