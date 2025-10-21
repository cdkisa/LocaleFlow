import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useState, useEffect } from "react";
import { Save, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { ProjectLanguage, TranslationKey, Translation } from "@shared/schema";

interface TranslationData {
  [keyId: string]: {
    [languageId: string]: {
      id?: string;
      value: string;
      status: string;
    };
  };
}

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In Review" },
  { value: "approved", label: "Approved" },
];

const statusColors = {
  draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  in_review: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  approved: "bg-chart-2/10 text-chart-2 border-chart-2/20",
};

export default function TranslationEditor() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [translationData, setTranslationData] = useState<TranslationData>({});

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

  // Initialize translation data when translations load
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
        return await apiRequest("PATCH", `/api/translations/${params.translationId}`, {
          value: params.value,
          status: params.status,
        });
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
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "translations"] });
      toast({
        title: "Success",
        description: "Translation saved",
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
      const response = await apiRequest("POST", `/api/translations/${translationId}/ai-suggest`, {});
      return await response.json();
    },
    onSuccess: (data: { suggestion: string }) => {
      toast({
        title: "Translation Suggested",
        description: "AI suggestion added to the field",
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
        description: error.message || "Failed to get suggestion",
        variant: "destructive",
      });
    },
  });

  const updateTranslation = (
    keyId: string,
    languageId: string,
    field: "value" | "status",
    value: string
  ) => {
    setTranslationData((prev) => ({
      ...prev,
      [keyId]: {
        ...prev[keyId],
        [languageId]: {
          ...prev[keyId]?.[languageId],
          [field]: value,
        },
      },
    }));
  };

  const handleSave = (keyId: string, languageId: string) => {
    const data = translationData[keyId]?.[languageId];
    if (data && data.value) {
      saveTranslation.mutate({
        keyId,
        languageId,
        value: data.value,
        status: data.status || "draft",
        translationId: data.id,
      });
    }
  };

  const defaultLanguage = languages?.find((l) => l.isDefault);

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
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-muted-foreground">No translation keys available</p>
        </CardContent>
      </Card>
    );
  }

  const currentKey = selectedKey ? keys.find((k) => k.id === selectedKey) : keys[0];
  const currentKeyId = currentKey?.id || keys[0]?.id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Translation Editor</h1>
        <p className="text-muted-foreground">
          Translate your content side-by-side across all languages
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Key Selector */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Translation Keys</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {keys.map((key) => (
                <button
                  key={key.id}
                  onClick={() => setSelectedKey(key.id)}
                  className={`w-full text-left px-4 py-2 text-sm font-mono hover-elevate ${
                    currentKeyId === key.id ? "bg-accent" : ""
                  }`}
                  data-testid={`button-select-key-${key.id}`}
                >
                  {key.key}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Translation Panel */}
        <div className="lg:col-span-3 space-y-4">
          {currentKey && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-mono text-lg">{currentKey.key}</CardTitle>
                      {currentKey.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {currentKey.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                {languages?.map((lang) => {
                  const translationInfo = translationData[currentKeyId]?.[lang.id];
                  const value = translationInfo?.value || "";
                  const status = translationInfo?.status || "draft";
                  const isDefault = lang.isDefault;

                  return (
                    <Card key={lang.id} data-testid={`card-translation-${lang.id}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{lang.languageCode}</span>
                            <span className="text-sm text-muted-foreground">
                              {lang.languageName}
                            </span>
                            {isDefault && (
                              <Badge variant="outline" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={statusColors[status as keyof typeof statusColors]}
                          >
                            {status.replace("_", " ")}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Textarea
                          value={value}
                          onChange={(e) =>
                            updateTranslation(currentKeyId, lang.id, "value", e.target.value)
                          }
                          placeholder={`Enter ${lang.languageName} translation...`}
                          className="min-h-24"
                          data-testid={`input-translation-${lang.id}`}
                        />

                        <div className="flex items-center gap-2">
                          <Select
                            value={status}
                            onValueChange={(val) =>
                              updateTranslation(currentKeyId, lang.id, "status", val)
                            }
                          >
                            <SelectTrigger className="flex-1" data-testid={`select-status-${lang.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {!isDefault && defaultLanguage && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const translationInfo = translationData[currentKeyId]?.[lang.id];
                                const sourceText = translationData[currentKeyId]?.[defaultLanguage.id]?.value;
                                
                                if (!sourceText) {
                                  toast({
                                    title: "Source text required",
                                    description: `Please add a translation in ${defaultLanguage.languageName} first`,
                                    variant: "destructive",
                                  });
                                  return;
                                }

                                let translationId = translationInfo?.id;
                                
                                if (!translationId) {
                                  try {
                                    const response = await apiRequest("POST", "/api/translations", {
                                      keyId: currentKeyId,
                                      languageId: lang.id,
                                      value: "",
                                      status: "draft",
                                    });
                                    const newTranslation = await response.json();
                                    translationId = newTranslation.id;
                                    
                                    setTranslationData((prev) => ({
                                      ...prev,
                                      [currentKeyId]: {
                                        ...prev[currentKeyId],
                                        [lang.id]: {
                                          id: translationId,
                                          value: "",
                                          status: "draft",
                                        },
                                      },
                                    }));
                                  } catch (error) {
                                    toast({
                                      title: "Error",
                                      description: "Failed to create translation",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                }

                                if (!translationId) {
                                  toast({
                                    title: "Error",
                                    description: "Unable to get translation ID",
                                    variant: "destructive",
                                  });
                                  return;
                                }

                                suggestTranslation.mutate(
                                  translationId,
                                  {
                                    onSuccess: (data) => {
                                      if (data.suggestion) {
                                        updateTranslation(
                                          currentKeyId,
                                          lang.id,
                                          "value",
                                          data.suggestion
                                        );
                                      }
                                    },
                                  }
                                );
                              }}
                              disabled={suggestTranslation.isPending}
                              data-testid={`button-suggest-${lang.id}`}
                            >
                              {suggestTranslation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Sparkles className="h-3 w-3" />
                              )}
                            </Button>
                          )}

                          <Button
                            onClick={() => handleSave(currentKeyId, lang.id)}
                            disabled={!value || saveTranslation.isPending}
                            size="sm"
                            data-testid={`button-save-${lang.id}`}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            Save
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
