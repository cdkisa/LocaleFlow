import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useState, useEffect } from "react";
import { Sparkles, Loader2, Search, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type {
  ProjectLanguage,
  TranslationKey,
  Translation,
} from "@shared/schema";

interface TranslationData {
  [keyId: string]: {
    [languageId: string]: {
      id?: string;
      value: string;
      status: string;
    };
  };
}

const statusColors = {
  draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  in_review: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  approved: "bg-chart-2/10 text-chart-2 border-chart-2/20",
};

function HighlightedText({ text }: { text: string }) {
  if (!text) return null;

  const parts = text.split(/(\{[^}]+\})/g);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {parts.map((part, index) => {
        if (part.match(/\{[^}]+\}/)) {
          return (
            <Badge
              key={index}
              variant="outline"
              className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs font-mono px-1 py-0"
              data-testid={`badge-placeholder-${index}`}
            >
              {part}
            </Badge>
          );
        }
        return (
          <span key={index} className="text-sm">
            {part}
          </span>
        );
      })}
    </div>
  );
}

function TranslationCell({
  keyId,
  translationKey,
  language,
  translationData,
  onUpdate,
  onSave,
  onAISuggest,
  isDefault,
  isSaving,
  isSuggesting,
}: {
  keyId: string;
  translationKey: TranslationKey;
  language: ProjectLanguage;
  translationData: TranslationData;
  onUpdate: (keyId: string, languageId: string, value: string) => void;
  onSave: (keyId: string, languageId: string) => Promise<void>;
  onAISuggest: (keyId: string, languageId: string) => void;
  isDefault: boolean;
  isSaving: boolean;
  isSuggesting: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [originalValue, setOriginalValue] = useState("");
  const translationInfo = translationData[keyId]?.[language.id];
  const value = translationInfo?.value || "";
  const status = translationInfo?.status || "draft";
  const hasValue = value.trim().length > 0;

  const handleEditStart = () => {
    setOriginalValue(value);
    setIsEditing(true);
  };

  const handleCancel = () => {
    onUpdate(keyId, language.id, originalValue);
    setIsEditing(false);
  };

  const handleSaveClick = async () => {
    await onSave(keyId, language.id);
    setIsEditing(false);
  };

  return (
    <div className="min-w-64">
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={value}
            onChange={(e) => onUpdate(keyId, language.id, e.target.value)}
            placeholder="Enter translation..."
            autoFocus
            rows={1}
            data-testid={`input-translation-${keyId}-${language.id}`}
          />
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={statusColors[status as keyof typeof statusColors]}
            >
              {status.replace("_", " ")}
            </Badge>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
              data-testid={`button-cancel-${keyId}-${language.id}`}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveClick}
              disabled={isSaving}
              data-testid={`button-save-${keyId}-${language.id}`}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
              ) : (
                <Check className="h-3.5 w-3.5 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div
            onClick={handleEditStart}
            className="cursor-text min-h-12 flex items-center p-2 rounded-md hover-elevate"
            data-testid={`text-translation-${keyId}-${language.id}`}
          >
            {hasValue ? (
              <HighlightedText text={value} />
            ) : (
              <span className="text-sm text-destructive">Empty</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Badge
              variant="outline"
              className={statusColors[status as keyof typeof statusColors]}
            >
              {status.replace("_", " ")}
            </Badge>
            <div className="flex-1" />
            {!isDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAISuggest(keyId, language.id)}
                disabled={isSuggesting}
                data-testid={`button-ai-suggest-${keyId}-${language.id}`}
              >
                {isSuggesting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-2" />
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TranslationEditor() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [translationData, setTranslationData] = useState<TranslationData>({});
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const [suggestingStates, setSuggestingStates] = useState<
    Record<string, boolean>
  >({});
  const [isBulkTranslating, setIsBulkTranslating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  const { data: languages } = useQuery<ProjectLanguage[]>({
    queryKey: ["/api/projects", id, "languages"],
  });

  const { data: keys, isLoading: keysLoading } = useQuery<TranslationKey[]>({
    queryKey: ["/api/projects", id, "keys"],
  });

  const { data: translations } = useQuery<Translation[]>({
    queryKey: ["/api/projects", id, "translations"],
    enabled: !!id,
  });

  useEffect(() => {
    if (translations) {
      const data: TranslationData = {};
      translations.forEach((t) => {
        if (!data[t.keyId]) data[t.keyId] = {};
        data[t.keyId][t.languageId] = {
          id: t.id,
          value: t.value,
          status: t.status,
        };
      });
      setTranslationData(data);
    }
  }, [translations]);

  const saveTranslation = useMutation({
    mutationFn: async (params: {
      keyId: string;
      languageId: string;
      value: string;
      status: string;
      translationId?: string;
    }) => {
      if (params.translationId) {
        return await apiRequest(
          "PATCH",
          `/api/translations/${params.translationId}`,
          {
            value: params.value,
            status: params.status,
          },
        );
      } else {
        return await apiRequest("POST", "/api/translations", {
          keyId: params.keyId,
          languageId: params.languageId,
          value: params.value,
          status: params.status,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", id, "translations"],
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to save translation",
        variant: "destructive",
      });
    },
  });

  const suggestTranslation = useMutation({
    mutationFn: async (translationId: string) => {
      const response = await apiRequest(
        "POST",
        `/api/translations/${translationId}/ai-suggest`,
        {},
      );
      return await response.json();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to get suggestion",
        variant: "destructive",
      });
    },
  });

  const updateTranslation = (
    keyId: string,
    languageId: string,
    value: string,
  ) => {
    setTranslationData((prev) => ({
      ...prev,
      [keyId]: {
        ...prev[keyId],
        [languageId]: {
          ...prev[keyId]?.[languageId],
          value,
        },
      },
    }));
  };

  const handleSave = async (keyId: string, languageId: string) => {
    const data = translationData[keyId]?.[languageId];
    const saveKey = `${keyId}-${languageId}`;
    setSavingStates((prev) => ({ ...prev, [saveKey]: true }));

    try {
      await saveTranslation.mutateAsync({
        keyId,
        languageId,
        value: data?.value || "",
        status: data?.status || "draft",
        translationId: data?.id,
      });
      toast({
        title: "Saved",
        description: "Translation saved successfully",
      });
    } finally {
      setSavingStates((prev) => ({ ...prev, [saveKey]: false }));
    }
  };

  const handleAISuggest = async (keyId: string, languageId: string) => {
    const defaultLanguage = languages?.find((l) => l.isDefault);
    if (!defaultLanguage) {
      toast({
        title: "Error",
        description: "No default language set",
        variant: "destructive",
      });
      return;
    }

    const sourceText = translationData[keyId]?.[defaultLanguage.id]?.value;
    if (!sourceText) {
      toast({
        title: "Source text required",
        description: `Please add a translation in ${defaultLanguage.languageName} first`,
        variant: "destructive",
      });
      return;
    }

    const suggestKey = `${keyId}-${languageId}`;
    setSuggestingStates((prev) => ({ ...prev, [suggestKey]: true }));

    try {
      let translationId = translationData[keyId]?.[languageId]?.id;

      if (!translationId) {
        const response = await apiRequest("POST", "/api/translations", {
          keyId,
          languageId,
          value: "",
          status: "draft",
        });
        const newTranslation = await response.json();
        translationId = newTranslation.id;

        setTranslationData((prev) => ({
          ...prev,
          [keyId]: {
            ...prev[keyId],
            [languageId]: {
              id: translationId,
              value: "",
              status: "draft",
            },
          },
        }));
      }

      if (!translationId) {
        toast({
          title: "Error",
          description: "Unable to create translation record",
          variant: "destructive",
        });
        return;
      }

      const result = await suggestTranslation.mutateAsync(translationId);
      if (result.suggestion) {
        updateTranslation(keyId, languageId, result.suggestion);
        toast({
          title: "AI Suggestion",
          description: "Translation suggestion added",
        });
      }
    } catch (error) {
    } finally {
      setSuggestingStates((prev) => ({ ...prev, [suggestKey]: false }));
    }
  };

  const handleBulkTranslate = async () => {
    const defaultLanguage = languages?.find((l) => l.isDefault);
    if (!defaultLanguage) {
      toast({
        title: "Error",
        description: "No default language set",
        variant: "destructive",
      });
      return;
    }

    const nonDefaultLanguages = languages?.filter((l) => !l.isDefault) || [];
    if (nonDefaultLanguages.length === 0) {
      toast({
        title: "No target languages",
        description: "Add non-default languages to translate to",
        variant: "destructive",
      });
      return;
    }

    const selectedKeysList = Array.from(selectedKeys);
    const keysWithSource = selectedKeysList.filter(
      (keyId) => translationData[keyId]?.[defaultLanguage.id]?.value?.trim()
    );

    if (keysWithSource.length === 0) {
      toast({
        title: "No source text",
        description: `All selected keys need translations in ${defaultLanguage.languageName} first`,
        variant: "destructive",
      });
      return;
    }

    const totalTranslations = keysWithSource.length * nonDefaultLanguages.length;
    setIsBulkTranslating(true);
    setBulkProgress({ current: 0, total: totalTranslations });

    let completed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const keyId of keysWithSource) {
      for (const lang of nonDefaultLanguages) {
        try {
          const existingValue = translationData[keyId]?.[lang.id]?.value;
          
          if (existingValue && existingValue.trim()) {
            completed++;
            setBulkProgress({ current: completed, total: totalTranslations });
            continue;
          }

          let translationId = translationData[keyId]?.[lang.id]?.id;

          if (!translationId) {
            const response = await apiRequest("POST", "/api/translations", {
              keyId,
              languageId: lang.id,
              value: "",
              status: "draft",
            });
            const newTranslation = await response.json();
            translationId = newTranslation.id;

            setTranslationData((prev) => ({
              ...prev,
              [keyId]: {
                ...prev[keyId],
                [lang.id]: {
                  id: translationId,
                  value: "",
                  status: "draft",
                },
              },
            }));
          }

          if (translationId) {
            const result = await suggestTranslation.mutateAsync(translationId);
            if (result.suggestion) {
              updateTranslation(keyId, lang.id, result.suggestion);
              succeeded++;
            }
          }
        } catch (error) {
          failed++;
        }

        completed++;
        setBulkProgress({ current: completed, total: totalTranslations });
      }
    }

    setIsBulkTranslating(false);
    setBulkProgress({ current: 0, total: 0 });
    
    queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "translations"] });
    
    toast({
      title: "Bulk Translation Complete",
      description: `${succeeded} translations generated${failed > 0 ? `, ${failed} failed` : ""}`,
    });
  };

  const toggleKeySelection = (keyId: string) => {
    setSelectedKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const toggleAllKeys = () => {
    if (selectedKeys.size === filteredKeys.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filteredKeys.map((k) => k.id)));
    }
  };

  const filteredKeys =
    keys?.filter(
      (key) =>
        key.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        key.description?.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  const totalKeys = keys?.length || 0;
  const translatedKeys =
    keys?.filter((key) => {
      const hasAllTranslations = languages?.every((lang) =>
        translationData[key.id]?.[lang.id]?.value?.trim(),
      );
      return hasAllTranslations;
    }).length || 0;

  if (keysLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!keys || keys.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">No translation keys available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Translation Editor</h1>
          <p className="text-sm text-muted-foreground">
            {totalKeys} keys · {translatedKeys} fully translated
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search keys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
              data-testid="input-search"
            />
          </div>
        </div>
      </div>

      {selectedKeys.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-accent/50 border rounded-lg">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedKeys(new Set())}
              data-testid="button-clear-selection"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedKeys.size} {selectedKeys.size === 1 ? "key" : "keys"} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isBulkTranslating ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  Translating {bulkProgress.current} of {bulkProgress.total}...
                </span>
              </div>
            ) : (
              <Button
                onClick={handleBulkTranslate}
                disabled={isBulkTranslating}
                data-testid="button-bulk-translate"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Translate Selected
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Checkbox
                  checked={
                    selectedKeys.size === filteredKeys.length &&
                    filteredKeys.length > 0
                  }
                  onCheckedChange={toggleAllKeys}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead className="min-w-48">Key</TableHead>
              <TableHead className="min-w-48">Translations</TableHead>
              {/* {languages?.map((lang) => (
                <TableHead key={lang.id} className="min-w-64">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{lang.languageCode}</span>
                    <span className="text-muted-foreground font-normal">
                      {lang.languageName}
                    </span>
                    {lang.isDefault && (
                      <Badge variant="outline" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                </TableHead>
              ))} */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredKeys.map((key) => (
              <TableRow key={key.id} data-testid={`row-key-${key.id}`}>
                <TableCell className="align-top">
                  <Checkbox
                    checked={selectedKeys.has(key.id)}
                    onCheckedChange={() => toggleKeySelection(key.id)}
                    data-testid={`checkbox-key-${key.id}`}
                  />
                </TableCell>
                <TableCell className="align-top max-w-60 text-wrap break-all">
                  <div>
                    <div className="font-mono text-xs">{key.key}</div>
                    {key.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {key.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Table>
                    <TableBody>
                      {languages?.map((lang) => (
                        <TableRow key={lang.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground w-20">
                            {lang.languageCode}
                          </TableCell>
                          <TableCell className="align-top">
                            <TranslationCell
                              keyId={key.id}
                              translationKey={key}
                              language={lang}
                              translationData={translationData}
                              onUpdate={updateTranslation}
                              onSave={handleSave}
                              onAISuggest={handleAISuggest}
                              isDefault={!!lang.isDefault}
                              isSaving={
                                savingStates[`${key.id}-${lang.id}`] || false
                              }
                              isSuggesting={
                                suggestingStates[`${key.id}-${lang.id}`] || false
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableCell>
                {/* {languages?.map((lang) => (
                  <TableCell key={lang.id} className="align-top">
                    <TranslationCell
                      keyId={key.id}
                      translationKey={key}
                      language={lang}
                      translationData={translationData}
                      onUpdate={updateTranslation}
                      onSave={handleSave}
                      onAISuggest={handleAISuggest}
                      isDefault={!!lang.isDefault}
                      isSaving={savingStates[`${key.id}-${lang.id}`] || false}
                      isSuggesting={suggestingStates[`${key.id}-${lang.id}`] || false}
                    />
                  </TableCell>
                ))} */}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
