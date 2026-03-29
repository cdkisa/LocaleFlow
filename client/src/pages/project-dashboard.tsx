import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocaleFormat } from "@/hooks/useLocaleFormat";
import {
  Plus,
  Settings,
  FileDown,
  FileUp,
  FileText,
  Trash2,
  Upload,
  Link as LinkIcon,
  ExternalLink,
  Edit,
  Languages,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type {
  Project,
  ProjectLanguage,
  TranslationKey,
  Translation,
  Document,
  ProjectHyperlink,
} from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

interface TranslationWithDetails extends Translation {
  key?: string;
  languageCode?: string;
}

const statusColors = {
  draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  in_review: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  approved: "bg-chart-2/10 text-chart-2 border-chart-2/20",
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation("project");
  const { t: tc } = useTranslation("common");
  const { formatDate, formatFileSize } = useLocaleFormat();

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", id],
  });

  const { data: languages } = useQuery<ProjectLanguage[]>({
    queryKey: ["/api/projects", id, "languages"],
    enabled: !!id,
  });

  const { data: keys } = useQuery<TranslationKey[]>({
    queryKey: ["/api/projects", id, "keys"],
    enabled: !!id,
  });

  const { data: translations } = useQuery<TranslationWithDetails[]>({
    queryKey: ["/api/projects", id, "translations"],
    enabled: !!id,
  });

  const { data: documents } = useQuery<Document[]>({
    queryKey: ["/api/projects", id, "documents"],
    enabled: !!id,
  });

  const {
    data: hyperlinks,
    isLoading: hyperlinksLoading,
    error: hyperlinksError,
  } = useQuery<ProjectHyperlink[]>({
    queryKey: ["/api/projects", id, "hyperlinks"],
    enabled: !!id,
  });

  const [pseudoDialogOpen, setPseudoDialogOpen] = useState(false);
  const [pseudoTargetLanguageId, setPseudoTargetLanguageId] = useState<string>("");
  const [isPreTranslateDialogOpen, setIsPreTranslateDialogOpen] = useState(false);
  const [preTranslateLanguageId, setPreTranslateLanguageId] = useState<string>("");
  const [isPreTranslating, setIsPreTranslating] = useState(false);
  const [preTranslateProgress, setPreTranslateProgress] = useState<{ translated: number; skipped: number; errors: number } | null>(null);
  const [isHyperlinkDialogOpen, setIsHyperlinkDialogOpen] = useState(false);
  const [editingHyperlink, setEditingHyperlink] =
    useState<ProjectHyperlink | null>(null);

  const hyperlinkSchema = z.object({
    label: z.string().min(1, "Label is required").max(255),
    url: z.string().url("Must be a valid URL"),
  });

  type HyperlinkFormData = z.infer<typeof hyperlinkSchema>;

  const hyperlinkForm = useForm<HyperlinkFormData>({
    resolver: zodResolver(hyperlinkSchema),
    defaultValues: {
      label: "",
      url: "",
    },
  });

  const createHyperlink = useMutation({
    mutationFn: async (data: HyperlinkFormData) => {
      try {
        const res = await apiRequest(
          "POST",
          `/api/projects/${id}/hyperlinks`,
          data
        );
        // Check content type before parsing
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return await res.json();
        } else {
          // If not JSON, read as text to see what we got
          const text = await res.text();
          console.error("Non-JSON response received:", text.substring(0, 200));
          throw new Error(`${res.status}: ${text.substring(0, 100)}`);
        }
      } catch (error: any) {
        console.error("Error in createHyperlink mutationFn:", error);
        // Re-throw to let onError handle it
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["/api/projects", id, "hyperlinks"],
      });
      // Force refetch
      await queryClient.refetchQueries({
        queryKey: ["/api/projects", id, "hyperlinks"],
      });
      hyperlinkForm.reset();
      setIsHyperlinkDialogOpen(false);
      setEditingHyperlink(null);
      toast({
        title: tc("toast.success"),
        description: t("toast.hyperlinkAdded"),
      });
    },
    onError: (error: Error) => {
      console.error("Error creating hyperlink:", error);
      if (isUnauthorizedError(error)) {
        toast({
          title: tc("toast.unauthorized"),
          description: tc("toast.unauthorizedDesc"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      // Try to parse error message from JSON response
      let errorMessage = t("toast.failedCreateHyperlink");
      if (error?.message) {
        // Error format is usually "status: text"
        const match = error.message.match(/^\d+:\s*(.+)$/);
        if (match) {
          const responseText = match[1];
          // Check if response is HTML (starts with <!DOCTYPE or <html)
          if (
            responseText.trim().startsWith("<!DOCTYPE") ||
            responseText.trim().startsWith("<html")
          ) {
            // This is an HTML error page, likely a 404 or server error
            const statusMatch = error.message.match(/^(\d+):/);
            const statusCode = statusMatch ? statusMatch[1] : "500";
            if (statusCode === "404") {
              errorMessage = t("toast.apiNotFound");
            } else {
              errorMessage = t("toast.serverError", { code: statusCode });
            }
          } else {
            // Try to parse as JSON
            try {
              const parsed = JSON.parse(responseText);
              errorMessage = parsed.message || errorMessage;
            } catch {
              // If it's not JSON, use the text as-is (but truncate if too long)
              errorMessage =
                responseText.length > 100
                  ? responseText.substring(0, 100) + "..."
                  : responseText;
            }
          }
        } else {
          errorMessage = error.message;
        }
      }
      toast({
        title: tc("toast.error"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateHyperlink = useMutation({
    mutationFn: async ({
      id: hyperlinkId,
      ...data
    }: HyperlinkFormData & { id: string }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/projects/${id}/hyperlinks/${hyperlinkId}`,
        data
      );
      return await res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["/api/projects", id, "hyperlinks"],
      });
      // Force refetch
      await queryClient.refetchQueries({
        queryKey: ["/api/projects", id, "hyperlinks"],
      });
      hyperlinkForm.reset();
      setIsHyperlinkDialogOpen(false);
      setEditingHyperlink(null);
      toast({
        title: tc("toast.success"),
        description: t("toast.hyperlinkUpdated"),
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: tc("toast.unauthorized"),
          description: tc("toast.unauthorizedDesc"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      // Try to parse error message from JSON response
      let errorMessage = t("toast.failedUpdateHyperlink");
      if (error?.message) {
        const match = error.message.match(/^\d+:\s*(.+)$/);
        if (match) {
          try {
            const parsed = JSON.parse(match[1]);
            errorMessage = parsed.message || errorMessage;
          } catch {
            errorMessage = match[1] || errorMessage;
          }
        } else {
          errorMessage = error.message;
        }
      }
      toast({
        title: tc("toast.error"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const deleteHyperlink = useMutation({
    mutationFn: async (hyperlinkId: string) => {
      const res = await apiRequest(
        "DELETE",
        `/api/projects/${id}/hyperlinks/${hyperlinkId}`,
        null
      );
      // DELETE endpoint returns { success: true }, so parse JSON
      try {
        return await res.json();
      } catch {
        // If response is empty, just return success
        return { success: true };
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["/api/projects", id, "hyperlinks"],
      });
      // Force refetch
      await queryClient.refetchQueries({
        queryKey: ["/api/projects", id, "hyperlinks"],
      });
      toast({
        title: tc("toast.success"),
        description: t("toast.hyperlinkDeleted"),
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: tc("toast.unauthorized"),
          description: tc("toast.unauthorizedDesc"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      // Try to parse error message from JSON response
      let errorMessage = t("toast.failedDeleteHyperlink");
      if (error?.message) {
        const match = error.message.match(/^\d+:\s*(.+)$/);
        if (match) {
          try {
            const parsed = JSON.parse(match[1]);
            errorMessage = parsed.message || errorMessage;
          } catch {
            errorMessage = match[1] || errorMessage;
          }
        } else {
          errorMessage = error.message;
        }
      }
      toast({
        title: tc("toast.error"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleHyperlinkSubmit = (data: HyperlinkFormData) => {
    if (editingHyperlink) {
      updateHyperlink.mutate({ ...data, id: editingHyperlink.id });
    } else {
      createHyperlink.mutate(data);
    }
  };

  const handleEditHyperlink = (hyperlink: ProjectHyperlink) => {
    setEditingHyperlink(hyperlink);
    hyperlinkForm.reset({
      label: hyperlink.label,
      url: hyperlink.url,
    });
    setIsHyperlinkDialogOpen(true);
  };

  const handleAddHyperlink = () => {
    setEditingHyperlink(null);
    hyperlinkForm.reset({
      label: "",
      url: "",
    });
    setIsHyperlinkDialogOpen(true);
  };

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      return await apiRequest(
        "DELETE",
        `/api/projects/${id}/documents/${documentId}`,
        null
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", id, "documents"],
      });
      toast({
        title: tc("toast.success"),
        description: t("toast.documentDeleted"),
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: tc("toast.unauthorized"),
          description: tc("toast.unauthorizedDesc"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: tc("toast.error"),
        description: error.message || t("toast.failedDeleteDocument"),
        variant: "destructive",
      });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/projects/${id}`, null);
    },
    onSuccess: () => {
      // Cancel any in-flight queries for this project to prevent 404s
      queryClient.cancelQueries({ queryKey: ["/api/projects", id] });
      // Remove all queries related to this project from cache
      queryClient.removeQueries({ queryKey: ["/api/projects", id] });
      // Invalidate only the exact projects list query (for dashboard) - use exact match to avoid refetching project detail
      queryClient.invalidateQueries({
        queryKey: ["/api/projects"],
        exact: true,
      });
      toast({
        title: tc("toast.success"),
        description: t("toast.projectDeleted"),
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: tc("toast.unauthorized"),
          description: tc("toast.unauthorizedDesc"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: tc("toast.error"),
        description: error.message || t("toast.failedDeleteProject"),
        variant: "destructive",
      });
    },
  });

  const pseudoLocalize = useMutation({
    mutationFn: async (targetLanguageId: string) => {
      const res = await apiRequest("POST", `/api/projects/${id}/pseudo-localize`, {
        targetLanguageId,
      });
      return await res.json();
    },
    onSuccess: (data: { generated: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "translations"] });
      setPseudoDialogOpen(false);
      setPseudoTargetLanguageId("");
      toast({
        title: tc("toast.success"),
        description: `Generated ${data.generated} pseudo-translated string${data.generated !== 1 ? "s" : ""}.`,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: tc("toast.unauthorized"),
          description: tc("toast.unauthorizedDesc"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: tc("toast.error"),
        description: error.message || "Failed to pseudo-localize",
        variant: "destructive",
      });
    },
  });

  // Compute how many source strings are available for pseudo-localization
  const pseudoSourceCount = (() => {
    if (!languages || !keys || !translations) return 0;
    const defaultLang = languages.find(l => l.isDefault);
    if (!defaultLang) return 0;
    return translations.filter(
      t => t.languageId === defaultLang.id && t.value && t.value.trim().length > 0
    ).length;
  })();

  // Languages available as pseudo-localization targets (all non-default)
  const pseudoTargetLanguages = languages?.filter(l => !l.isDefault) || [];

  const handlePreTranslate = async () => {
    if (!preTranslateLanguageId) {
      toast({
        title: tc("toast.error"),
        description: "Please select a target language",
        variant: "destructive",
      });
      return;
    }

    setIsPreTranslating(true);
    setPreTranslateProgress(null);

    try {
      const response = await apiRequest(
        "POST",
        `/api/projects/${id}/pre-translate`,
        { languageId: preTranslateLanguageId },
      );
      const result = await response.json();
      setPreTranslateProgress(result);

      queryClient.invalidateQueries({
        queryKey: ["/api/projects", id, "translations"],
      });

      toast({
        title: tc("toast.success"),
        description: `${result.translated} translated, ${result.skipped} skipped${result.errors > 0 ? `, ${result.errors} errors` : ""}`,
      });
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        toast({
          title: tc("toast.unauthorized"),
          description: tc("toast.unauthorizedDesc"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: tc("toast.error"),
        description: error.message || "Failed to pre-translate",
        variant: "destructive",
      });
    } finally {
      setIsPreTranslating(false);
    }
  };

  const handleGetUploadParameters = async () => {
    const res = await fetch("/api/objects/upload", {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => {
    if (!result.successful || result.successful.length === 0) return;

    const file = result.successful[0];
    // Get upload URL from file metadata (stored by ObjectUploader)
    const uploadUrl =
      (file.meta?.uploadURL as string) ||
      (file.uploadURL as string) ||
      (file.response?.uploadURL as string);

    if (!uploadUrl) {
      toast({
        title: tc("toast.error"),
        description: t("toast.uploadUrlError"),
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await apiRequest("POST", `/api/projects/${id}/documents`, {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadUrl,
      });

      queryClient.invalidateQueries({
        queryKey: ["/api/projects", id, "documents"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", id, "keys"],
      });

      toast({
        title: tc("toast.success"),
        description: t("toast.documentUploaded"),
      });
    } catch (error: any) {
      toast({
        title: tc("toast.error"),
        description: error.message || t("toast.failedProcessDocument"),
        variant: "destructive",
      });
    }
  };

  const getTranslationStats = () => {
    if (!languages || !keys || !translations) return null;

    const totalPossible = languages.length * keys.length;
    const completed = translations.filter(
      (t) => t.status === "approved"
    ).length;
    const inReview = translations.filter(
      (t) => t.status === "in_review"
    ).length;
    const draft = translations.filter((t) => t.status === "draft").length;

    return {
      total: totalPossible,
      completed,
      inReview,
      draft,
      missing: totalPossible - translations.length,
      progress:
        totalPossible > 0 ? Math.round((completed / totalPossible) * 100) : 0,
    };
  };

  const stats = getTranslationStats();

  if (projectLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-muted-foreground">{t("dashboard.projectNotFound")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button asChild data-testid="button-open-editor">
            <Link href={`/projects/${id}/editor`}>
              <FileText className="mr-2 h-4 w-4" />
              {t("dashboard.translationEditor")}
            </Link>
          </Button>
          <Dialog open={pseudoDialogOpen} onOpenChange={setPseudoDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-pseudo-localize">
                <Languages className="mr-2 h-4 w-4" />
                Pseudo-localize
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pseudo-localize Translations</DialogTitle>
                <DialogDescription>
                  Generate pseudo-translated strings to help identify layout issues,
                  hard-coded strings, and truncation problems before real translations begin.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Language</label>
                  <Select
                    value={pseudoTargetLanguageId}
                    onValueChange={setPseudoTargetLanguageId}
                  >
                    <SelectTrigger data-testid="select-pseudo-language">
                      <SelectValue placeholder="Select a language..." />
                    </SelectTrigger>
                    <SelectContent>
                      {pseudoTargetLanguages.map((lang) => (
                        <SelectItem key={lang.id} value={lang.id}>
                          {lang.languageName} ({lang.languageCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {pseudoTargetLanguageId && (
                  <p className="text-sm text-muted-foreground">
                    {pseudoSourceCount} source string{pseudoSourceCount !== 1 ? "s" : ""} will
                    be pseudo-translated into{" "}
                    <strong>
                      {pseudoTargetLanguages.find(l => l.id === pseudoTargetLanguageId)?.languageName}
                    </strong>
                    . Existing translations for this language will be overwritten.
                  </p>
                )}

                {pseudoTargetLanguages.length === 0 && (
                  <p className="text-sm text-destructive">
                    No target languages available. Add a non-default language to the project first.
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPseudoDialogOpen(false)}
                >
                  {tc("actions.cancel")}
                </Button>
                <Button
                  onClick={() => pseudoLocalize.mutate(pseudoTargetLanguageId)}
                  disabled={
                    !pseudoTargetLanguageId ||
                    pseudoLocalize.isPending ||
                    pseudoSourceCount === 0
                  }
                  data-testid="button-confirm-pseudo-localize"
                >
                  {pseudoLocalize.isPending ? tc("actions.generating") : "Generate"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog
            open={isPreTranslateDialogOpen}
            onOpenChange={(open) => {
              setIsPreTranslateDialogOpen(open);
              if (!open) {
                setPreTranslateLanguageId("");
                setPreTranslateProgress(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-pre-translate">
                <Languages className="mr-2 h-4 w-4" />
                Pre-translate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pre-translate</DialogTitle>
                <DialogDescription>
                  Automatically translate all empty translations for a selected language using AI. Translations will be saved as drafts for review.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Language</label>
                  <Select
                    value={preTranslateLanguageId}
                    onValueChange={setPreTranslateLanguageId}
                    disabled={isPreTranslating}
                  >
                    <SelectTrigger data-testid="select-pre-translate-language">
                      <SelectValue placeholder="Select a language..." />
                    </SelectTrigger>
                    <SelectContent>
                      {languages
                        ?.filter((l) => !l.isDefault)
                        .map((lang) => (
                          <SelectItem key={lang.id} value={lang.id}>
                            <span className="font-mono mr-2">{lang.languageCode}</span>
                            {lang.languageName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {isPreTranslating && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Translating... This may take a while.</span>
                    </div>
                    <Progress value={undefined} className="h-2" />
                  </div>
                )}
                {preTranslateProgress && !isPreTranslating && (
                  <div className="space-y-1 text-sm">
                    <p className="text-chart-2">{preTranslateProgress.translated} translations created</p>
                    <p className="text-muted-foreground">{preTranslateProgress.skipped} skipped (already translated or no source)</p>
                    {preTranslateProgress.errors > 0 && (
                      <p className="text-destructive">{preTranslateProgress.errors} errors</p>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setIsPreTranslateDialogOpen(false)}
                  disabled={isPreTranslating}
                  data-testid="button-pre-translate-cancel"
                >
                  {preTranslateProgress ? "Close" : tc("actions.cancel")}
                </Button>
                {!preTranslateProgress && (
                  <Button
                    onClick={handlePreTranslate}
                    disabled={isPreTranslating || !preTranslateLanguageId}
                    data-testid="button-pre-translate-start"
                  >
                    {isPreTranslating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Translating...
                      </>
                    ) : (
                      <>
                        <Languages className="h-4 w-4 mr-2" />
                        Start Pre-translation
                      </>
                    )}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" asChild data-testid="button-import">
            <Link href={`/projects/${id}/import`}>
              <FileUp className="mr-2 h-4 w-4" />
              {tc("actions.import")}
            </Link>
          </Button>
          <Button variant="outline" asChild data-testid="button-export">
            <Link href={`/projects/${id}/export`}>
              <FileDown className="mr-2 h-4 w-4" />
              {tc("actions.export")}
            </Link>
          </Button>
          <Button variant="outline" asChild data-testid="button-settings">
            <Link href={`/projects/${id}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              {tc("actions.settings")}
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                data-testid="button-delete-project"
                disabled={deleteProject.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("dashboard.deleteProject")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("dashboard.confirmDelete")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("dashboard.confirmDeleteDesc", { name: project.name })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteProject.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-delete-project"
                >
                  {deleteProject.isPending ? tc("actions.deleting") : t("dashboard.deleteProject")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.stats.progress")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.progress}%</div>
              <p className="text-xs text-muted-foreground">
                {t("dashboard.stats.translations", { completed: stats.completed, total: stats.total })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.stats.approved")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.stats.inReview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inReview}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.stats.missing")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.missing}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Languages */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.languages")}</CardTitle>
          <CardDescription>
            {t("dashboard.languagesConfigured", { count: languages?.length || 0 })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {languages?.map((lang) => (
              <Badge
                key={lang.id}
                variant="outline"
                className="px-3 py-1"
                data-testid={`badge-language-${lang.languageCode}`}
              >
                <span className="font-mono mr-2">{lang.languageCode}</span>
                {lang.languageName}
                {lang.isDefault && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({tc("labels.default")})
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hyperlinks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("dashboard.hyperlinks")}</CardTitle>
              <CardDescription>
                {t("dashboard.hyperlinksDesc")}
              </CardDescription>
            </div>
            <Dialog
              open={isHyperlinkDialogOpen}
              onOpenChange={setIsHyperlinkDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  onClick={handleAddHyperlink}
                  data-testid="button-add-hyperlink"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {tc("actions.addLink")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingHyperlink ? t("dashboard.editHyperlink") : t("dashboard.addHyperlink")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("dashboard.addHyperlinkDesc")}
                  </DialogDescription>
                </DialogHeader>
                <Form {...hyperlinkForm}>
                  <form
                    onSubmit={hyperlinkForm.handleSubmit(handleHyperlinkSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={hyperlinkForm.control}
                      name="label"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{tc("labels.label")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Documentation, GitHub Repository"
                              {...field}
                              data-testid="input-hyperlink-label"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={hyperlinkForm.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{tc("labels.url")}</FormLabel>
                          <FormControl>
                            <Input
                              type="url"
                              placeholder="https://example.com"
                              {...field}
                              data-testid="input-hyperlink-url"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsHyperlinkDialogOpen(false);
                          setEditingHyperlink(null);
                          hyperlinkForm.reset();
                        }}
                        data-testid="button-cancel-hyperlink"
                      >
                        {tc("actions.cancel")}
                      </Button>
                      <Button
                        type="submit"
                        disabled={
                          createHyperlink.isPending || updateHyperlink.isPending
                        }
                        data-testid="button-submit-hyperlink"
                      >
                        {editingHyperlink ? tc("actions.edit") : tc("actions.add")}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {hyperlinks && hyperlinks.length > 0 ? (
            <div className="space-y-2">
              {hyperlinks.map((hyperlink) => (
                <div
                  key={hyperlink.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <a
                      href={hyperlink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-medium hover:underline truncate"
                      data-testid={`link-${hyperlink.id}`}
                    >
                      {hyperlink.label}
                      <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditHyperlink(hyperlink)}
                      data-testid={`button-edit-hyperlink-${hyperlink.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteHyperlink.mutate(hyperlink.id)}
                      disabled={deleteHyperlink.isPending}
                      data-testid={`button-delete-hyperlink-${hyperlink.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <LinkIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("dashboard.noHyperlinks")}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleAddHyperlink}
                data-testid="button-add-first-hyperlink"
              >
                <Plus className="h-4 w-4 mr-2" />
                {tc("actions.addFirstLink")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("dashboard.documents")}</CardTitle>
              <CardDescription>
                {t("dashboard.documentsDesc")}
              </CardDescription>
            </div>
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={20971520}
              allowedFileTypes={[
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              ]}
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleUploadComplete}
              buttonVariant="default"
            >
              <Upload className="mr-2 h-4 w-4" />
              {tc("actions.uploadDocument")}
            </ObjectUploader>
          </div>
        </CardHeader>
        <CardContent>
          {documents && documents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tc("labels.fileName")}</TableHead>
                  <TableHead>{tc("labels.type")}</TableHead>
                  <TableHead>{tc("labels.size")}</TableHead>
                  <TableHead>{tc("labels.status")}</TableHead>
                  <TableHead>{tc("labels.uploaded")}</TableHead>
                  <TableHead className="text-right">{tc("labels.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow
                    key={doc.id}
                    data-testid={`row-document-${doc.id}`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {doc.fileName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {doc.fileType.includes("pdf") ? t("dashboard.fileTypePdf") : t("dashboard.fileTypeWord")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatFileSize(doc.fileSize)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          doc.status === "completed"
                            ? "default"
                            : doc.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                        data-testid={`badge-status-${doc.id}`}
                      >
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(doc.createdAt!)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDocument.mutate(doc.id)}
                        data-testid={`button-delete-document-${doc.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="mb-4">{t("dashboard.noDocuments")}</p>
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={20971520}
                allowedFileTypes={[
                  "application/pdf",
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ]}
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleUploadComplete}
                buttonVariant="default"
              >
                <Upload className="mr-2 h-4 w-4" />
                {tc("actions.uploadFirstDocument")}
              </ObjectUploader>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
