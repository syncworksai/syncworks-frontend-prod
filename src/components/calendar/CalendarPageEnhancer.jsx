import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import CalendarDailySnapshot from "./CalendarDailySnapshot";
import CalendarQuickCaptureLauncher from "./CalendarQuickCaptureLauncher";

const SNAPSHOT_ANCHOR_ID = "sw-calendar-daily-snapshot-anchor";
const CAPTURE_ANCHOR_ID = "sw-calendar-quick-capture-anchor";

function buttonText(button) {
  return String(button?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
}

export default function CalendarPageEnhancer() {
  const [snapshotAnchor, setSnapshotAnchor] = useState(null);
  const [captureAnchor, setCaptureAnchor] = useState(null);

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
        if (legacyQuickCapture) {
          legacyQuickCapture.dataset.swLegacyQuickCapture = "hidden";
          legacyQuickCapture.style.display = "none";
        }

        Array.from(document.querySelectorAll("#calendar-event-composer button")).forEach((button) => {
          const text = buttonText(button);
          if (!["save changes", "save event", "save task"].includes(text)) return;
          button.style.flex = "0 0 auto";
          button.style.width = "auto";
          button.style.minWidth = "132px";
          button.style.maxWidth = "220px";
          button.style.paddingLeft = "18px";
          button.style.paddingRight = "18px";
        });

        const masterSection = sections.find((section) => {
          const text = String(section.textContent || "").toLowerCase();
          return text.includes("master calendar") && text.includes("your schedule first");
        });

        if (masterSection) {
          let snapshotNode = document.getElementById(SNAPSHOT_ANCHOR_ID);
          if (!snapshotNode) {
            snapshotNode = document.createElement("div");
            snapshotNode.id = SNAPSHOT_ANCHOR_ID;
            snapshotNode.className = "mt-3";
            const firstChild = masterSection.children?.[0] || null;
            if (firstChild?.nextSibling) masterSection.insertBefore(snapshotNode, firstChild.nextSibling);
            else masterSection.appendChild(snapshotNode);
          }
          setSnapshotAnchor((current) => current === snapshotNode ? current : snapshotNode);

          const addEventButton = Array.from(masterSection.querySelectorAll("button")).find((button) => buttonText(button) === "add event");
          const actionRow = addEventButton?.parentElement || null;
          if (actionRow) {
            let captureNode = document.getElementById(CAPTURE_ANCHOR_ID);
            if (!captureNode) {
              captureNode = document.createElement("span");
              captureNode.id = CAPTURE_ANCHOR_ID;
              captureNode.className = "contents";
              actionRow.appendChild(captureNode);
            }
            setCaptureAnchor((current) => current === captureNode ? current : captureNode);
          }
        }
      });
    }

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      const snapshotNode = document.getElementById(SNAPSHOT_ANCHOR_ID);
      const captureNode = document.getElementById(CAPTURE_ANCHOR_ID);
      snapshotNode?.remove();
      captureNode?.remove();
    };
  }, []);

  return <>
    {snapshotAnchor ? createPortal(<CalendarDailySnapshot compact title="Daily quick actions" />, snapshotAnchor) : null}
    {captureAnchor ? createPortal(<CalendarQuickCaptureLauncher onSaved={() => window.location.reload()} />, captureAnchor) : null}
  </>;
}
