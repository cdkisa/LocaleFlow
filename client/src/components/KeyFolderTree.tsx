import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Folder, FileText, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KeyTreeNode } from "@/lib/keyTreeUtils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function collectKeyIds(node: KeyTreeNode): string[] {
  if (node.type === "key") return [node.id];
  return node.children.flatMap(collectKeyIds);
}

interface KeyFolderTreeProps {
  nodes: KeyTreeNode[];
  selectedKeyId?: string;
  selectedFolderPath?: string;
  onKeySelect?: (keyId: string) => void;
  onFolderSelect?: (folderPath: string) => void;
  onFolderClick?: (node: KeyTreeNode) => void;
  onDeleteNode?: (node: KeyTreeNode, keyIds: string[]) => void;
  expandedPaths?: Set<string>;
  onToggleExpand?: (path: string) => void;
  level?: number;
}

export function KeyFolderTree({
  nodes,
  selectedKeyId,
  selectedFolderPath,
  onKeySelect,
  onFolderSelect,
  onFolderClick,
  onDeleteNode,
  expandedPaths = new Set(),
  onToggleExpand,
  level = 0,
}: KeyFolderTreeProps) {
  const [deleteTarget, setDeleteTarget] = useState<KeyTreeNode | null>(null);

  const handleToggle = (node: KeyTreeNode, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isChevronClick = target.closest('.chevron') !== null;

    if (node.type === "folder") {
      if (isChevronClick) {
        if (onToggleExpand) {
          onToggleExpand(node.fullPath);
        }
      } else {
        if (onFolderSelect) {
          onFolderSelect(node.fullPath);
        }
      }
    } else if (node.type === "key" && onKeySelect) {
      onKeySelect(node.id);
    }
  };

  const isExpanded = (node: KeyTreeNode) => {
    return expandedPaths.has(node.fullPath);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget && onDeleteNode) {
      const keyIds = collectKeyIds(deleteTarget);
      onDeleteNode(deleteTarget, keyIds);
    }
    setDeleteTarget(null);
  };

  const deleteKeyCount = deleteTarget ? collectKeyIds(deleteTarget).length : 0;

  return (
    <>
      <div className="space-y-1">
        {nodes.map((node) => {
          const isSelected =
            (node.type === "key" && node.id === selectedKeyId) ||
            (node.type === "folder" && node.fullPath === selectedFolderPath);
          const hasChildren = node.children.length > 0;
          const expanded = isExpanded(node);

          const rowContent = (
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent/50 transition-colors",
                isSelected && "bg-accent"
              )}
              style={{ paddingLeft: `${level * 16 + 8}px` }}
              onClick={(e) => handleToggle(node, e)}
            >
              {node.type === "folder" ? (
                <>
                  {hasChildren ? (
                    <div
                      className="chevron cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleExpand) {
                          onToggleExpand(node.fullPath);
                        }
                      }}
                    >
                      {expanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  ) : (
                    <div className="w-4" />
                  )}
                  <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium truncate flex-1">
                    {node.name}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                    {collectKeyIds(node).length}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-4" />
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-mono truncate">{node.name}</span>
                  {node.keyData?.description && (
                    <span className="text-xs text-muted-foreground truncate ml-2">
                      - {node.keyData.description}
                    </span>
                  )}
                </>
              )}
            </div>
          );

          return (
            <div key={node.id}>
              {onDeleteNode ? (
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    {rowContent}
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(node)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {node.type === "folder" ? `Delete "${node.name}" folder` : `Delete "${node.name}"`}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ) : (
                rowContent
              )}
              {node.type === "folder" && expanded && hasChildren && (
                <KeyFolderTree
                  nodes={node.children}
                  selectedKeyId={selectedKeyId}
                  selectedFolderPath={selectedFolderPath}
                  onKeySelect={onKeySelect}
                  onFolderSelect={onFolderSelect}
                  onFolderClick={onFolderClick}
                  onDeleteNode={onDeleteNode}
                  expandedPaths={expandedPaths}
                  onToggleExpand={onToggleExpand}
                  level={level + 1}
                />
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === "folder"
                ? `Delete folder "${deleteTarget.name}"?`
                : `Delete key "${deleteTarget?.name}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "folder"
                ? `This will permanently delete all ${deleteKeyCount} key(s) inside "${deleteTarget.fullPath}" and its subfolders. This action cannot be undone.`
                : "This will permanently delete this translation key and all its translations. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface KeyFolderViewProps {
  nodes: KeyTreeNode[];
  selectedKeyId?: string;
  selectedFolderPath?: string;
  onKeySelect?: (keyId: string) => void;
  onFolderSelect?: (folderPath: string) => void;
  onDeleteNode?: (node: KeyTreeNode, keyIds: string[]) => void;
  searchQuery?: string;
}

export function KeyFolderView({
  nodes,
  selectedKeyId,
  selectedFolderPath,
  onKeySelect,
  onFolderSelect,
  onDeleteNode,
  searchQuery = "",
}: KeyFolderViewProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const handleToggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Auto-expand all folders when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const allPaths = new Set<string>();
      const collectPaths = (nodeList: typeof nodes): void => {
        for (const node of nodeList) {
          if (node.type === "folder") {
            allPaths.add(node.fullPath);
            if (node.children.length > 0) {
              collectPaths(node.children);
            }
          }
        }
      };
      collectPaths(nodes);
      setExpandedPaths(allPaths);
    }
  }, [searchQuery, nodes]);

  return (
    <div className="border rounded-lg p-4 bg-card">
      <KeyFolderTree
        nodes={nodes}
        selectedKeyId={selectedKeyId}
        selectedFolderPath={selectedFolderPath}
        onKeySelect={onKeySelect}
        onFolderSelect={onFolderSelect}
        onDeleteNode={onDeleteNode}
        expandedPaths={expandedPaths}
        onToggleExpand={handleToggleExpand}
      />
    </div>
  );
}
