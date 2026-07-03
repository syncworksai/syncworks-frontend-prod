import React from "react";
import { cx } from "./GlassCard";
import "./BottomMobileNav.css";

function NavItem({ item }) {
  return (
    <button
      type="button"
      onClick={item.onClick}
      className={cx(
        "sync-bottom-nav-item",
        item.active && "sync-bottom-nav-item--active"
      )}
      aria-current={item.active ? "page" : undefined}
    >
      <span className="sync-bottom-nav-icon" aria-hidden="true">
        {item.icon}
      </span>
      <span className="sync-bottom-nav-label">{item.label}</span>
    </button>
  );
}

export default function BottomMobileNav({ items = [], centerAction }) {
  const leftItems = items.slice(0, 2);
  const rightItems = items.slice(2, 4);

  return (
    <nav className="sync-bottom-nav lg:hidden" aria-label="Mobile navigation">
      <div className="sync-bottom-nav-grid">
        {leftItems.map((item) => (
          <NavItem key={item.label} item={item} />
        ))}

        <button
          type="button"
          onClick={centerAction?.onClick}
          className="sync-bottom-nav-center"
          title={centerAction?.label || "New"}
          aria-label={centerAction?.label || "New"}
        >
          <span className="sync-bottom-nav-center-orb" aria-hidden="true">
            +
          </span>
          <span className="sync-bottom-nav-center-label">
            {centerAction?.label || "New"}
          </span>
        </button>

        {rightItems.map((item) => (
          <NavItem key={item.label} item={item} />
        ))}
      </div>
    </nav>
  );
}
