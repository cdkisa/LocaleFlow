import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Upload,
  FileJson,
  FileSpreadsheet,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function ImportTranslations() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation("project");
  const { t: tc } = useTranslation("common");
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const importMutation = useMutation({
    mutationFn: async ({ format, data }: { format: string; data: any }) => {
      return await apiRequest("POST", `/api/projects/${id}/import`, {
        format,
        data,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      const message =
        data.draftsCreated > 0
          ? t("import.importedWithDrafts", { count: data.imported || 0, drafts: data.draftsCreated })
          : t("import.importedCount", { count: data.imported || 0 });

      toast({
        title: tc("toast.success"),
        description: message,
      });
      setLocation(`/projects/${id}`);
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
        description: error.message || t("import.failedImport"),
        variant: "destructive",
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: tc("toast.error"),
        description: t("import.selectFile"),
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        let data;

        if (format === "json") {
          data = JSON.parse(content);
        } else {
          data = content;
        }

        importMutation.mutate({ format, data });
      } catch (error) {
        toast({
          title: tc("toast.error"),
          description: t("import.failedRead"),
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <Link href={`/projects/${id}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tc("actions.backToProject")}
          </Button>
        </Link>
      </div>
      <div>
        <h1 className="text-3xl font-semibold mb-2">{t("import.title")}</h1>
        <p className="text-muted-foreground">
          {t("import.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("import.selectFormat")}</CardTitle>
          <CardDescription>
            {t("import.selectFormatDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={format}
            onValueChange={(v) => setFormat(v as "json" | "csv")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="json"
                id="json"
                data-testid="radio-format-json"
              />
              <Label
                htmlFor="json"
                className="flex items-center gap-2 cursor-pointer"
              >
                <FileJson className="h-4 w-4" />
                {t("import.json")}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="csv"
                id="csv"
                data-testid="radio-format-csv"
              />
              <Label
                htmlFor="csv"
                className="flex items-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {t("import.csv")}
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("import.uploadFile")}</CardTitle>
          <CardDescription>
            {t("import.uploadFileDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-border"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            data-testid="dropzone"
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept={format === "json" ? ".json" : ".csv"}
              onChange={handleFileChange}
              data-testid="input-file"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              {file ? (
                <div>
                  <p className="text-sm font-medium mb-1">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium mb-1">
                    {t("import.dropHere", { format: format.toUpperCase() })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("import.orBrowse")}
                  </p>
                </div>
              )}
            </label>
          </div>

          {format === "json" && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <div>
                    <strong>{t("import.flatFormat")}</strong> {t("import.flatFormatDesc")}
                    <code className="text-xs block mt-1 p-2 bg-muted rounded">
                      {`{ "home.title": "Welcome", "home.subtitle": "Get Started" }`}
                    </code>
                  </div>
                  <div>
                    <strong>{t("import.namespaceFormat")}</strong> {t("import.namespaceFormatDesc")}
                    <code className="text-xs block mt-1 p-2 bg-muted rounded">
                      {`{ "common": { "settings": "Settings", "theme": "Theme" } }`}
                    </code>
                  </div>
                  <div>
                    <strong>{t("import.languageSingle")}</strong> {t("import.languageSingleDesc")}
                    <code className="text-xs block mt-1 p-2 bg-muted rounded">
                      {`{ "en": { "home.title": "Welcome" } }`}
                    </code>
                  </div>
                  <div>
                    <strong>{t("import.languageMulti")}</strong> {t("import.languageMultiDesc")}
                    <code className="text-xs block mt-1 p-2 bg-muted rounded">
                      {`{ "en": { "home.title": "Welcome" }, "fr": { "home.title": "Bienvenue" } }`}
                    </code>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {format === "csv" && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{t("import.csvFormat")}</strong> {t("import.csvFormatDesc")}{" "}
                <code className="text-xs">key,language_code,value,status</code>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          onClick={handleImport}
          disabled={!file || importMutation.isPending}
          data-testid="button-import"
        >
          {importMutation.isPending ? tc("actions.importing") : t("import.title")}
        </Button>
        <Button
          variant="outline"
          onClick={() => setLocation(`/projects/${id}`)}
          data-testid="button-cancel"
        >
          {tc("actions.cancel")}
        </Button>
      </div>
    </div>
  );
}
