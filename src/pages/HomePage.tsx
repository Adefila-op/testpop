import { useState } from "react";
import { Link } from "react-router-dom";
import { featureCards } from "../data/mockData";

export function HomePage() {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % featureCards.length);
  };

  return (
    <section className="screen screen--home-stack">
      <div className="home-stack-container">
        <div className="card-stack">
          {featureCards.map((product, index) => {
            const position = (index - activeIndex + featureCards.length) % featureCards.length;
            const isActive = position === 0;
            const isVisible = position < 3;

            return isVisible ? (
              <div
                key={product.id}
                className={`card-stack__item ${isActive ? "card-stack__item--active" : ""}`}
                style={{
                  background: product.accent,
                  zIndex: featureCards.length - position,
                  transform: `translateY(${position * 12}px) scale(${1 - position * 0.04})`,
                }}
                onClick={isActive ? handleNext : undefined}
              >
                <div className="card-stack-header">
                  <button type="button" className="card-stack-location">
                    📍 {product.creator}
                  </button>
                  <span className="card-stack-position">
                    {activeIndex + 1}/{featureCards.length}
                  </span>
                </div>

                <div className="card-stack-content">
                  <div className="card-stack-avatar">{product.creator.charAt(0)}</div>
                  <h2 className="card-stack-title">{product.title}</h2>
                  <p className="card-stack-creator">{product.creator}</p>
                  <p className="card-stack-handle">{product.handle}</p>

                  <div className="card-stack-description">
                    <p>{product.summary}</p>
                  </div>

                  <div className="card-stack-tags">
                    <span className="card-stack-tag">{product.type}</span>
                    <span className="card-stack-tag">{product.price}</span>
                  </div>
                </div>

                <div className="card-stack-actions">
                  <Link
                    to={`/product/${product.id}`}
                    className="card-action-btn card-action-btn--secondary"
                  >
                    {product.previewLabel}
                  </Link>
                  <Link
                    to={`/product/${product.id}`}
                    className="card-action-btn card-action-btn--primary"
                  >
                    Collect {product.price}
                  </Link>
                </div>

                <div className="card-stack-hint">
                  {isActive && <p>Tap to see next</p>}
                </div>
              </div>
            ) : null;
          })}
        </div>
      </div>
    </section>
  );
}
