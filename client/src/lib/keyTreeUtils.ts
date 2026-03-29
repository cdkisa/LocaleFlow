import type { TranslationKey } from "@shared/schema";

export interface KeyTreeNode {
  id: string;
  name: string;
  fullPath: string;
  type: "folder" | "key";
  children: KeyTreeNode[];
  keyData?: TranslationKey;
  level: number;
}

/**
 * Parses translation keys into a hierarchical tree structure
 * Keys like "home.welcome.title" become: folder "home" > folder "welcome" > key "title"
 */
export function buildKeyTree(keys: TranslationKey[]): KeyTreeNode[] {
  const root: KeyTreeNode[] = [];
  const folderMap = new Map<string, KeyTreeNode>();

  for (const key of keys) {
    const parts = key.key.split(".");
    let currentPath = "";
    let parentNode: KeyTreeNode | null = null;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLastPart = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}.${part}` : part;

      if (isLastPart) {
        // This is the actual key
        const keyNode: KeyTreeNode = {
          id: key.id,
          name: part,
          fullPath: key.key,
          type: "key",
          children: [],
          keyData: key,
          level: i,
        };

        if (parentNode) {
          parentNode.children.push(keyNode);
        } else {
          root.push(keyNode);
        }
      } else {
        // This is a folder
        let folderNode = folderMap.get(currentPath);
        if (!folderNode) {
          folderNode = {
            id: `folder-${currentPath}`,
            name: part,
            fullPath: currentPath,
            type: "folder",
            children: [],
            level: i,
          };
          folderMap.set(currentPath, folderNode);

          if (parentNode) {
            parentNode.children.push(folderNode);
          } else {
            root.push(folderNode);
          }
        }
        parentNode = folderNode;
      }
    }
  }

  // Sort each level: folders first, then keys, both alphabetically
  function sortNode(node: KeyTreeNode): void {
    node.children.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortNode);
  }

  root.forEach(sortNode);
  return root;
}

/**
 * Flattens the tree structure for display/search purposes
 */
export function flattenTree(nodes: KeyTreeNode[]): KeyTreeNode[] {
  const result: KeyTreeNode[] = [];
  
  function traverse(node: KeyTreeNode): void {
    result.push(node);
    node.children.forEach(traverse);
  }
  
  nodes.forEach(traverse);
  return result;
}

/**
 * Filters tree nodes based on search query
 */
export function filterTree(
  nodes: KeyTreeNode[],
  searchQuery: string,
  translationData?: Record<string, Record<string, { value: string }>>
): KeyTreeNode[] {
  if (!searchQuery.trim()) {
    return nodes;
  }

  const query = searchQuery.toLowerCase();
  const filtered: KeyTreeNode[] = [];

  function matches(node: KeyTreeNode): boolean {
    if (node.type === "key" && node.keyData) {
      if (
        node.keyData.key.toLowerCase().includes(query) ||
        node.keyData.description?.toLowerCase().includes(query)
      ) {
        return true;
      }
      // Search translation values
      if (translationData) {
        const keyTranslations = translationData[node.keyData.id];
        if (keyTranslations) {
          for (const langData of Object.values(keyTranslations)) {
            if (langData.value?.toLowerCase().includes(query)) return true;
          }
        }
      }
      return false;
    }
    return node.name.toLowerCase().includes(query);
  }

  function filterNode(node: KeyTreeNode): KeyTreeNode | null {
    const matchesThis = matches(node);
    const filteredChildren = node.children
      .map(filterNode)
      .filter((n): n is KeyTreeNode => n !== null);

    if (matchesThis || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
      };
    }
    return null;
  }

  nodes.forEach((node) => {
    const filteredNode = filterNode(node);
    if (filteredNode) {
      filtered.push(filteredNode);
    }
  });

  return filtered;
}

/**
 * Gets the folder path for creating a new key
 * e.g., if current folder is "home.welcome", returns "home.welcome"
 */
export function getFolderPath(node: KeyTreeNode | null): string {
  if (!node) return "";
  if (node.type === "key" && node.keyData) {
    const parts = node.keyData.key.split(".");
    parts.pop(); // Remove the key name, keep only folder path
    return parts.join(".");
  }
  return node.fullPath;
}

/**
 * Gets all keys within a folder recursively (including all subfolders)
 */
export function getKeysInFolder(
  nodes: KeyTreeNode[],
  folderPath: string
): TranslationKey[] {
  const keys: TranslationKey[] = [];

  const collectKeysRecursively = (nodeList: KeyTreeNode[]): void => {
    for (const node of nodeList) {
      if (node.type === "key" && node.keyData) {
        keys.push(node.keyData);
      } else if (node.type === "folder") {
        // Recursively collect keys from all subfolders
        collectKeysRecursively(node.children);
      }
    }
  };

  const findFolder = (nodeList: KeyTreeNode[]): KeyTreeNode | null => {
    for (const node of nodeList) {
      if (node.type === "folder" && node.fullPath === folderPath) {
        return node;
      }
      if (node.type === "folder") {
        const found = findFolder(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  // For root folder (empty path), get all keys recursively
  if (folderPath === "") {
    collectKeysRecursively(nodes);
  } else {
    // Find the folder node and get all keys recursively from it and its subfolders
    const folderNode = findFolder(nodes);
    if (folderNode) {
      collectKeysRecursively(folderNode.children);
    }
  }

  return keys;
}

