# Sales swipe actions

The browser interaction adapts Apple's trailing swipe-action convention: a partial left swipe reveals a red Delete action; a full swipe performs it. Source: https://developer.apple.com/documentation/swiftui/view/swipeactions(edge:allowsfullswipe:content:)

The local visual reference is docs/liquid-glass-provenance.md and src/liquid-glass.css. The implementation uses the existing motion variables and reduced-motion fallback; no native SwiftUI package is installed into this JavaScript app.

src/sales-swipe.js keeps one row open, locks horizontal gestures only after direction is established, leaves vertical scrolling native, and offers keyboard reveal/cancel. Deletion saves a deletedAt marker through the existing owner-scoped sales write path; readers exclude it from deals and recaps. A twelve-second Undo action restores the original record. Failed writes keep the row available. The existing editor Delete confirmation is unchanged.

The Admin viewing banner uses the existing admin_user_last_active RPC and relativeActivity formatter. It displays Last active rather than labeling activity as authentication. Refreshes stop when the banner is removed or the selected user changes. No new database permissions or schema are required.
