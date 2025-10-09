import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { ProjectLanguage } from "@shared/schema";

export default function ExportTranslations() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const { data: languages } = useQuery<ProjectLanguage[]>({
    queryKey: ["/api/projects", id, "languages"],
  });

  const toggleLanguage = (langId: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(langId) ? prev.filter((l) => l !== langId) : [...prev, langId]
    );
  };

  const handleExport = async () => {
    if (selectedLanguages.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one language",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        format,
        languages: selectedLanguages.join(","),
      });

      const response = await fetch(`/api/projects/${id}/export?${params}`);

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `translations-${id}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Translations exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export translations",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Export Translations</h1>
        <p className="text-muted-foreground">
          Download your translations in JSON or CSV format
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Format</CardTitle>
          <CardDescription>Choose the export format</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as "json" | "csv")}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="json" id="json-export" data-testid="radio-format-json" />
              <Label htmlFor="json-export" className="flex items-center gap-2 cursor-pointer">
                <FileJson className="h-4 w-4" />
                JSON - Nested format for easy integration
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="csv" id="csv-export" data-testid="radio-format-csv" />
              <Label htmlFor="csv-export" className="flex items-center gap-2 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4" />
                CSV - Spreadsheet format for easy editing
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Languages</CardTitle>
          <CardDescription>Choose which languages to include in the export</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {languages?.map((lang) => (
              <div key={lang.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`lang-${lang.id}`}
                  checked={selectedLanguages.includes(lang.id)}
                  onCheckedChange={() => toggleLanguage(lang.id)}
                  data-testid={`checkbox-language-${lang.id}`}
                />
                <Label
                  htmlFor={`lang-${lang.id}`}
                  className="flex items-center gap-2 cursor-pointer font-normal"
                >
                  <span className="font-mono text-sm">{lang.languageCode}</span>
                  <span className="text-sm text-muted-foreground">{lang.languageName}</span>
                  {lang.isDefault && (
                    <span className="text-xs text-muted-foreground">(default)</span>
                  )}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          onClick={handleExport}
          disabled={selectedLanguages.length === 0 || isExporting}
          data-testid="button-export"
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "Exporting..." : "Export Translations"}
        </Button>
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          data-testid="button-cancel"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
