import { Link } from "react-router-dom";
import { useDemoWallet } from "../hooks/useDemoWallet";
import { useCollections } from "../hooks/useCollections";
import { featureCards } from "../data/mockData";

export function ProfilePage() {
  const { address, isConnected, connect } = useDemoWallet();
  const { collectedItems } = useCollections();

  const collected = featureCards.filter((item) => collectedItems.includes(item.id));

  return (
    <section className="screen screen--profile">
      {!isConnected ? (
        <div className="profile-login-section">
          <div className="profile-login-content">
            <h2>Your Collection</h2>
            <p className="profile-login-text">Connect your wallet to view and manage your collection.</p>
            <button type="button" className="cta-button cta-button--primary" onClick={connect}>
              Connect Wallet
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="profile-header">
            <div className="profile-header__info">
              <h2>Your Collection</h2>
              <p className="profile-address">Connected: {address}</p>
            </div>
          </div>

          {collected.length === 0 ? (
            <div className="empty-collection">
              <div className="empty-state">
                <h3>No items collected yet</h3>
                <p>Start collecting digital products from creators on POPUP</p>
                <Link to="/discover" className="cta-button cta-button--primary">
                  Browse Products
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="collection-stats">
                <div className="stat-card">
                  <span className="stat-label">Total Items</span>
                  <span className="stat-value">{collected.length}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Unique Creators</span>
                  <span className="stat-value">{new Set(collected.map((c) => c.creatorId)).size}</span>
                </div>
              </div>

              <div className="collection-section">
                <h3>Collected Items</h3>
                <div className="collection-grid">
                  {collected.map((item) => (
                    <Link
                      key={item.id}
                      to={`/product/${item.id}`}
                      className="collection-item"
                      style={{
                        "--accent": item.accent,
                      } as React.CSSProperties}
                    >
                      <div
                        className="collection-item__media"
                        style={{ background: item.accent }}
                      />
                      <div className="collection-item__overlay">
                        <span className="collection-item__type">{item.type}</span>
                        <span className="collection-item__title">{item.title}</span>
                        <span className="collection-item__creator">{item.creator}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      <div className="profile-actions">
        <Link to="/discover" className="profile-panel">
          <h3>← Browse More</h3>
          <p>Discover new products and creators</p>
        </Link>
        <Link to="/marketplace" className="profile-panel">
          <h3>Marketplace →</h3>
          <p>Trade creator tokens</p>
        </Link>
        <Link to="/creators" className="profile-panel">
          <h3>Creator Studio →</h3>
          <p>Launch your own products</p>
        </Link>
      </div>

      {isConnected && (
        <div className="profile-footer">
          <button 
            type="button" 
            className="link-button"
            onClick={() => {
              // Would disconnect wallet here
              window.location.reload();
            }}
          >
            Disconnect wallet
          </button>
        </div>
      )}
    </section>
  );
}
