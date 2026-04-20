import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { featureCards } from "../data/mockData";
import { useDemoWallet } from "../hooks/useDemoWallet";
import { useCollections } from "../hooks/useCollections";

export function ProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const product = featureCards.find((item) => item.id === productId) ?? featureCards[0];
  const { isConnected, connect } = useDemoWallet();
  const { collect, isCollected } = useCollections();
  const [isCollecting, setIsCollecting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const collected = isCollected(product.id);

  const handleCollect = async () => {
    if (!isConnected) {
      connect();
      return;
    }

    setIsCollecting(true);
    // Simulate transaction delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    collect(product.id);
    setIsCollecting(false);
  };

  return (
    <section className="screen screen--product-detail">
      <div className="product-detail-media" style={{ background: product.accent }}>
        <span className="product-badge">{product.type}</span>
        {showPreview && (
          <div className="product-preview-overlay">
            <button 
              className="preview-close"
              onClick={() => setShowPreview(false)}
              aria-label="Close preview"
            >
              ×
            </button>
            <div className="preview-content">
              <p className="preview-text">📄 {product.type} Preview</p>
              <p className="preview-note">{product.summary}</p>
            </div>
          </div>
        )}
      </div>

      <div className="product-detail-content">
        <div className="product-detail-creator">
          <span className="product-detail-creator__label">By Creator</span>
          <p className="product-detail-creator__name">{product.creator}</p>
          <p className="product-detail-creator__handle">{product.handle}</p>
        </div>

        <h1 className="product-detail-title">{product.title}</h1>

        <div className="product-detail-meta">
          <span className="meta-item">Type: {product.type}</span>
          <span className="meta-item">Price: {product.price}</span>
          <span className="meta-item">❤️ {product.likes} likes</span>
          <span className="meta-item">🎁 {product.gifts} gifts</span>
        </div>

        <div className="product-detail-actions">
          <button
            type="button"
            className="cta-button cta-button--secondary"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? "Hide preview" : product.previewLabel}
          </button>

          <button
            type="button"
            className={`cta-button cta-button--primary ${collected ? "cta-button--collected" : ""}`}
            onClick={handleCollect}
            disabled={isCollecting || collected}
          >
            {isCollecting && "Processing..."}
            {!isCollecting && collected && "✓ Collected"}
            {!isCollecting && !collected && `Collect ${product.price}`}
          </button>
        </div>

        {collected && (
          <div className="product-collected-badge">
            <p>✓ You own this product</p>
            <button 
              type="button" 
              className="link-button"
              onClick={() => navigate("/profile")}
            >
              View in collection →
            </button>
          </div>
        )}

        <div className="product-detail-description">
          <h3>About this product</h3>
          <p>{product.summary}</p>
          <ul className="detail-points">
            <li>Digital {product.type.toLowerCase()} from {product.creator}</li>
            <li>Instant access after collection</li>
            <li>Resellable on POPUP marketplace</li>
            <li>Your ownership recorded onchain</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
