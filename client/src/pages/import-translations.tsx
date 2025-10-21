import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileJson, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const importMutation = useMutation({
    mutationFn: async ({ format, data }: { format: string; data: any }) => {
      return await apiRequest("POST", `/api/projects/${id}/import`, { format, data });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      const message = data.draftsCreated > 0 
        ? `Imported ${data.imported || 0} translation(s) and auto-created ${data.draftsCreated} draft(s) for other languages`
        : `Imported ${data.imported || 0} translation(s)`;
      
      toast({
        title: "Success",
        description: message,
      });
      setLocation(`/projects/${id}`);
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
        description: error.message || "Failed to import translations",
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
        title: "Error",
        description: "Please select a file to import",
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
          title: "Error",
          description: "Failed to read file content",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Import Translations</h1>
        <p className="text-muted-foreground">
          Upload your translation files in JSON or CSV format
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Format</CardTitle>
          <CardDescription>Choose the format of your import file</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as "json" | "csv")}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="json" id="json" data-testid="radio-format-json" />
              <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer">
                <FileJson className="h-4 w-4" />
                JSON
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="csv" id="csv" data-testid="radio-format-csv" />
              <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4" />
                CSV
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>Drag and drop or click to select a file</CardDescription>
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
                    Drop your {format.toUpperCase()} file here
                  </p>
                  <p className="text-xs text-muted-foreground">or click to browse</p>
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
                    <strong>Flat Format:</strong> Simple key-value pairs use the project's default language.
                    <code className="text-xs block mt-1 p-2 bg-muted rounded">
                      {`{ "home.title": "Welcome", "home.subtitle": "Get Started" }`}
                    </code>
                  </div>
                  <div>
                    <strong>Namespace Format:</strong> Nested namespaces auto-flatten to dot-notation keys (common.settings).
                    <code className="text-xs block mt-1 p-2 bg-muted rounded">
                      {`{ "common": { "settings": "Settings", "theme": "Theme" } }`}
                    </code>
                  </div>
                  <div>
                    <strong>Language Format (single):</strong> Wrap in language code. Auto-creates drafts for other languages.
                    <code className="text-xs block mt-1 p-2 bg-muted rounded">
                      {`{ "en": { "home.title": "Welcome" } }`}
                    </code>
                  </div>
                  <div>
                    <strong>Language Format (multi):</strong> Import multiple languages at once.
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
                <strong>CSV Format:</strong> Use columns: key, language_code, value, status.
                Example header: <code className="text-xs">key,language_code,value,status</code>
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
          {importMutation.isPending ? "Importing..." : "Import Translations"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setLocation(`/projects/${id}`)}
          data-testid="button-cancel"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
