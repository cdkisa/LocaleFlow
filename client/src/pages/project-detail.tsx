import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { useState } from "react";
import { Plus, Settings, FileDown, FileUp, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Project, ProjectLanguage, TranslationKey, Translation } from "@shared/schema";

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
  const [searchQuery, setSearchQuery] = useState("");

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", id],
  });

  const { data: languages } = useQuery<ProjectLanguage[]>({
    queryKey: ["/api/projects", id, "languages"],
    enabled: !!id,
  });

  const { data: keys, isLoading: keysLoading } = useQuery<TranslationKey[]>({
    queryKey: ["/api/projects", id, "keys"],
    enabled: !!id,
  });

  const { data: translations } = useQuery<TranslationWithDetails[]>({
    queryKey: ["/api/projects", id, "translations"],
    enabled: !!id,
  });

  const deleteKey = useMutation({
    mutationFn: async (keyId: string) => {
      return await apiRequest("DELETE", `/api/translation-keys/${keyId}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "translations"] });
      toast({
        title: "Success",
        description: "Translation key deleted",
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
        description: error.message || "Failed to delete key",
        variant: "destructive",
      });
    },
  });

  const filteredKeys = keys?.filter(
    (key) =>
      key.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTranslationStats = () => {
    if (!languages || !keys || !translations) return null;

    const totalPossible = languages.length * keys.length;
    const completed = translations.filter((t) => t.status === "approved").length;
    const inReview = translations.filter((t) => t.status === "in_review").length;
    const draft = translations.filter((t) => t.status === "draft").length;

    return {
      total: totalPossible,
      completed,
      inReview,
      draft,
      missing: totalPossible - translations.length,
      progress: totalPossible > 0 ? Math.round((completed / totalPossible) * 100) : 0,
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
          <p className="text-muted-foreground">Project not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild data-testid="button-import">
            <Link href={`/projects/${id}/import`}>
              <FileUp className="mr-2 h-4 w-4" />
              Import
            </Link>
          </Button>
          <Button variant="outline" asChild data-testid="button-export">
            <Link href={`/projects/${id}/export`}>
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Link>
          </Button>
          <Button variant="outline" asChild data-testid="button-settings">
            <Link href={`/projects/${id}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.progress}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.completed} of {stats.total} translations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inReview}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Missing</CardTitle>
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
          <CardTitle>Languages</CardTitle>
          <CardDescription>
            {languages?.length || 0} languages configured
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
                  <span className="ml-2 text-xs text-muted-foreground">(default)</span>
                )}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Translation Keys */}
      <Tabs defaultValue="keys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="keys" data-testid="tab-keys">Translation Keys</TabsTrigger>
          <TabsTrigger value="editor" data-testid="tab-editor">Editor</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search keys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-keys"
              />
            </div>
            <Button asChild data-testid="button-add-key">
              <Link href={`/projects/${id}/keys/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Add Key
              </Link>
            </Button>
          </div>

          {keysLoading ? (
            <Card>
              <CardContent className="py-8">
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : filteredKeys && filteredKeys.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKeys.map((key) => {
                    const keyTranslations = translations?.filter((t) => t.keyId === key.id) || [];
                    const approved = keyTranslations.filter((t) => t.status === "approved").length;
                    const total = languages?.length || 0;

                    return (
                      <TableRow key={key.id} data-testid={`row-key-${key.id}`}>
                        <TableCell className="font-mono text-sm">{key.key}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {key.description || "—"}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {approved}/{total} translated
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            data-testid={`button-edit-key-${key.id}`}
                          >
                            <Link href={`/projects/${id}/keys/${key.id}`}>Edit</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "No keys found" : "No translation keys yet"}
                </p>
                {!searchQuery && (
                  <Button asChild data-testid="button-add-first-key">
                    <Link href={`/projects/${id}/keys/new`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Key
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="editor">
          <Card>
            <CardHeader>
              <CardTitle>Translation Editor</CardTitle>
              <CardDescription>
                Translate your content across all languages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild data-testid="button-open-editor">
                <Link href={`/projects/${id}/editor`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Open Translation Editor
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
