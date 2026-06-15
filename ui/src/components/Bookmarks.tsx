import { useEffect, useState, useRef } from 'react';
import { getPDFDocument } from '../utils/pdfCache';
import { ChevronRight, ChevronDown, FileText } from 'lucide-react';

interface BookmarksProps {
  documentBytes: Uint8Array;
  currentPage: number;
  onSelectPage: (page: number) => void;
}

interface OutlineNode {
  title: string;
  dest: any;
  items: OutlineNode[];
}

/**
 * Recursively resolve all outline nodes to their 1-based page numbers.
 * Returns a Map from node object reference to page number.
 */
async function buildPageMap(
  nodes: OutlineNode[],
  pdfDoc: any,
  map: Map<OutlineNode, number>
): Promise<void> {
  for (const node of nodes) {
    if (node.dest) {
      try {
        let resolvedDest = node.dest;
        if (typeof resolvedDest === 'string') {
          resolvedDest = await pdfDoc.getDestination(resolvedDest);
        }
        if (Array.isArray(resolvedDest) && resolvedDest.length > 0) {
          const pageRef = resolvedDest[0];
          const pageIndex = await pdfDoc.getPageIndex(pageRef); // 0-based
          map.set(node, pageIndex + 1); // store as 1-based
        }
      } catch {
        // destination could not be resolved — skip silently
      }
    }
    if (node.items && node.items.length > 0) {
      await buildPageMap(node.items, pdfDoc, map);
    }
  }
}

/**
 * Flatten the outline tree into a sorted array of {node, page} pairs.
 * Used to find which bookmark "owns" the current page via a range lookup
 * instead of an exact match.
 */
function flattenSorted(
  nodes: OutlineNode[],
  pageMap: Map<OutlineNode, number>
): { node: OutlineNode; page: number }[] {
  const result: { node: OutlineNode; page: number }[] = [];
  const walk = (items: OutlineNode[]) => {
    for (const item of items) {
      const page = pageMap.get(item);
      if (page !== undefined) result.push({ node: item, page });
      if (item.items?.length) walk(item.items);
    }
  };
  walk(nodes);
  return result.sort((a, b) => a.page - b.page);
}

/**
 * Find all ancestor nodes that contain a node pointing at targetPage,
 * so we can auto-expand parent nodes when a child bookmark is active.
 */
function findAncestorsToExpand(
  nodes: OutlineNode[],
  targetPage: number,
  pageMap: Map<OutlineNode, number>,
  ancestors: Set<OutlineNode> = new Set()
): boolean {
  for (const node of nodes) {
    const nodePage = pageMap.get(node);
    const childHit =
      node.items && node.items.length > 0
        ? findAncestorsToExpand(node.items, targetPage, pageMap, ancestors)
        : false;

    if (nodePage === targetPage || childHit) {
      ancestors.add(node);
      return true;
    }
  }
  return false;
}

interface BookmarkItemProps {
  item: OutlineNode;
  depth: number;
  pageMap: Map<OutlineNode, number>;
  currentPage: number;
  /** The bookmark that "owns" the current page position (page ≤ currentPage) */
  activeNode: OutlineNode | null;
  /** True when the activeNode is this item but the reader has moved past its exact page */
  isDimmed: boolean;
  forceExpanded: boolean;
  onSelectPage: (p: number) => void;
}

function BookmarkItem({
  item,
  depth,
  pageMap,
  currentPage,
  activeNode,
  isDimmed,
  forceExpanded,
  onSelectPage,
}: BookmarkItemProps) {
  const [expanded, setExpanded] = useState(forceExpanded);
  const isActiveNode = activeNode === item;
  const hasChildren = item.items && item.items.length > 0;
  const itemRef = useRef<HTMLDivElement>(null);

  // Auto-expand when a child becomes active
  useEffect(() => {
    if (forceExpanded && !expanded) setExpanded(true);
  }, [forceExpanded]);

  // Scroll active bookmark into view only on exact-page match (full highlight)
  // to avoid continuous jitter as the user scrolls
  useEffect(() => {
    if (isActiveNode && !isDimmed && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActiveNode, isDimmed]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const page = pageMap.get(item);
    if (page !== undefined) {
      onSelectPage(page);
    }
    if (hasChildren) {
      setExpanded(prev => !prev);
    }
  };

  // Determine highlight class
  const highlightClass = isActiveNode
    ? isDimmed
      ? 'bookmark-dim-row'       // muted: we've scrolled past this bookmark's page
      : 'bookmark-active-row'    // full: we are exactly on this bookmark's page
    : 'text-lumvale-text hover:bg-white/10';

  return (
    <div className={depth > 0 ? 'ml-3' : ''}>
      <div
        ref={itemRef}
        data-testid="bookmark-item"
        data-active={isActiveNode && !isDimmed ? 'true' : 'false'}
        data-dim={isActiveNode && isDimmed ? 'true' : 'false'}
        className={`flex items-start gap-1.5 py-1.5 px-2 rounded cursor-pointer text-sm transition-all ${highlightClass}`}
        onClick={handleClick}
      >
        <div className="mt-0.5 opacity-60 shrink-0">
          {hasChildren ? (
            expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <FileText size={14} />
          )}
        </div>
        <span className="flex-1 break-words leading-tight select-none">{item.title}</span>
        {/* Pulsing dot — full highlight only */}
        {isActiveNode && !isDimmed && (
          <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-lumvale-primary animate-pulse" />
        )}
      </div>
      {expanded && hasChildren && (
        <div className="border-l border-white/10 ml-3 pl-1 mt-0.5">
          {item.items.map((child, idx) => {
            const ancestors = new Set<OutlineNode>();
            findAncestorsToExpand([child], currentPage, pageMap, ancestors);
            const childIsActive = activeNode === child;
            return (
              <BookmarkItem
                key={idx}
                item={child}
                depth={depth + 1}
                pageMap={pageMap}
                currentPage={currentPage}
                activeNode={activeNode}
                isDimmed={childIsActive ? isDimmed : false}
                forceExpanded={ancestors.has(child)}
                onSelectPage={onSelectPage}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Bookmarks({ documentBytes, currentPage, onSelectPage }: BookmarksProps) {
  const [outline, setOutline] = useState<OutlineNode[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageMap, setPageMap] = useState<Map<OutlineNode, number>>(new Map());
  const [flatList, setFlatList] = useState<{ node: OutlineNode; page: number }[]>([]);

  useEffect(() => {
    let active = true;

    const loadBookmarks = async () => {
      setLoading(true);
      try {
        const doc = await getPDFDocument(documentBytes);
        if (!active) return;

        const out = await doc.getOutline();
        if (!active) return;

        if (out && out.length > 0) {
          const map = new Map<OutlineNode, number>();
          await buildPageMap(out as OutlineNode[], doc, map);
          if (active) {
            setPageMap(map);
            setFlatList(flattenSorted(out as OutlineNode[], map));
            setOutline(out as OutlineNode[]);
          }
        } else {
          if (active) setOutline(out as OutlineNode[] | null);
        }
      } catch (err) {
        console.error('Failed to load bookmarks:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadBookmarks();
    return () => { active = false; };
  }, [documentBytes]);

  /**
   * Bug 2 fix: "sticky" active bookmark.
   *
   * Find the last bookmark in the sorted flat list whose page ≤ currentPage.
   * This bookmark "owns" the current reading position and stays highlighted
   * until the reader reaches the *next* bookmark's page.
   *
   * isDimmed = true when the reader has scrolled past the bookmark's exact
   * target page — render with the muted bookmark-dim-row style instead of
   * the full bookmark-active-row.
   */
  const activeEntry = flatList.reduce<{ node: OutlineNode; page: number } | null>(
    (best, entry) => (entry.page <= currentPage ? entry : best),
    null
  );
  const activeNode = activeEntry?.node ?? null;
  const isDimmed = activeEntry !== null && activeEntry.page < currentPage;

  if (loading) {
    return <div className="p-4 text-sm text-lumvale-muted text-center animate-pulse">Loading bookmarks...</div>;
  }

  if (!outline || outline.length === 0) {
    return (
      <div className="p-8 text-center text-lumvale-muted text-sm italic">
        This document has no bookmarks.
      </div>
    );
  }

  return (
    <div className="p-2 space-y-0.5">
      {outline.map((item, idx) => {
        const ancestors = new Set<OutlineNode>();
        findAncestorsToExpand([item], currentPage, pageMap, ancestors);
        const itemIsActive = activeNode === item;
        return (
          <BookmarkItem
            key={idx}
            item={item}
            depth={0}
            pageMap={pageMap}
            currentPage={currentPage}
            activeNode={activeNode}
            isDimmed={itemIsActive ? isDimmed : false}
            forceExpanded={ancestors.has(item)}
            onSelectPage={onSelectPage}
          />
        );
      })}
    </div>
  );
}
