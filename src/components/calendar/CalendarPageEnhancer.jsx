import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import NeedsAttentionCard from "../NeedsAttentionCard";
import CalendarDailySnapshot from "./CalendarDailySnapshot";
import CalendarQuickCaptureLauncher from "./CalendarQuickCaptureLauncher";
import UnifiedQuickAdd from "./UnifiedQuickAdd";

const SNAPSHOT_ANCHOR_ID = "sw-calendar-daily-snapshot-anchor";
const ACTION_ANCHOR_ID = "sw-calendar-command-actions-anchor";

function buttonText(button) {
  return String(button?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
}

export default function CalendarPageEnhancer() {
  const [snapshotAnchor, setSnapshotAnchor] = useState(null);
  const [actionAnchor, setActionAnchor] = useState(null);

  useEffect(() => {
    let frame = 0;

    function enhance() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const sections = Array.from(document.querySelectorAll("main section"));

        const legacyQuickCapture = sections.find((section) => {
          const text = String(section.textContent || "").toLowerCase();
          return text.includes("sync quick capture") && Boolean(section.querySelector('input[placeholder*="Add something"]'));
        });
        if (legacyQuickCapture) legacyQuickCapture.style.display = "none";

        Array.from(document.querySelectorAll("#calendar-event-composer button")).forEach((button) => {
          const text = buttonText(button);
          if (!["save changes", "save event", "save task"].includes(text)) return;
          button.style.flex = "0 0 auto";
          button.style.width = "auto";
          button.style.minWidth = "118px";
          button.style.maxWidth = "180px";
          button.style.paddingLeft = "14px";
          button.style.paddingRight = "14px";
        });

        const masterSection = sections.find((section) => {
          const text = String(section.textContent || "").toLowerCase();
          return text.includes("master calendar") && text.includes("your schedule first");
        });

        if (!masterSection) return;

        const addEventButton = Array.from(masterSection.querySelectorAll("button")).find((button) => buttonText(button) === "add event");
        const addTaskButton = Array.from(masterSection.querySelectorAll("button")).find((button) => buttonText(button) === "add task");
        const actionRow = addEventButton?.parentElement || null;

        if (addEventButton) addEventButton.style.display = "none";
        if (addTaskButton) addTaskButton.style.display = "none";

        if (actionRow) {
          actionRow.style.gap = "6px";
          Array.from(actionRow.querySelectorAll("button, a")).forEach((button) => {
            button.style.minHeight = "36px";
          });
          let actionNode = document.getElementById(ACTION_ANCHOR_ID);
          if (!actionNode) {
            actionNode = document.createElement("span");
            actionNode.id = ACTION_ANCHOR_ID;
            actionNode.className = "contents";
            actionRow.insertBefore(actionNode, actionRow.firstChild || null);
          }
          setActionAnchor((current) => current === actionNode ? current : actionNode);
        }

        let snapshotNode = document.getElementById(SNAPSHOT_ANCHOR_ID);
        if (!snapshotNode) {
          snapshotNode = document.createElement("div");
          snapshotNode.id = SNAPSHOT_ANCHOR_ID;
          snapshotNode.className = "mt-2";
          const firstChild = masterSection.children?.[0] || null;
          if (firstChild?.nextSibling) masterSection.insertBefore(snapshotNode, firstChild.nextSibling);
          else masterSection.appendChild(snapshotNode);
        }
        setSnapshotAnchor((current) => current === snapshotNode ? current : snapshotNode);

        // The large four-card upcoming rail duplicates the compact command-center view on desktop.
        const duplicateUpcoming = Array.from(masterSection.children).find((child) => {
          const className = String(child?.className || "");
          const text = String(child?.textContent || "").toLowerCase();
          return className.includes("xl:grid-cols-4") && (text.includes("route address") || text.includes("no routing address"));
        });
        if (duplicateUpcoming) duplicateUpcoming.style.display = window.innerWidth >= 1200 ? "none" : "grid";

        if (window.innerWidth >= 1024) {
          masterSection.style.padding = "12px 14px";
          masterSection.style.borderRadius = "22px";
        }
      });
    }

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", enhance);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", enhance);
      document.getElementById(SNAPSHOT_ANCHOR_ID)?.remove();
      document.getElementById(ACTION_ANCHOR_ID)?.remove();
    };
  }, []);

  return <>
    {snapshotAnchor ? createPortal(
      <div className="grid gap-2 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,.85fr)]">
        <CalendarDailySnapshot compact title="Today" />
        <NeedsAttentionCard compact maxItems={3} />
      </div>,
      snapshotAnchor,
    ) : null}
    {actionAnchor ? createPortal(<>
      <UnifiedQuickAdd onSaved={() => window.location.reload()} buttonClassName="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-3 text-[10px] font-black text-white" />
      <CalendarQuickCaptureLauncher onSaved={() => window.location.reload()} />
    </>, actionAnchor) : null}
  </>;
}
