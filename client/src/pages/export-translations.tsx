import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, FileJson, FileSpreadsheet } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { ProjectLanguage } from "@shared/schema";

export default function ExportTranslations() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { t } = useTranslation("project");
  const { t: tc } = useTranslation("common");
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [useNestedNamespaces, setUseNestedNamespaces] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const { data: languages } = useQuery<ProjectLanguage[]>({
    queryKey: ["/api/projects", id, "languages"],
  });

  const toggleLanguage = (langId: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(langId)
        ? prev.filter((l) => l !== langId)
        : [...prev, langId]
    );
  };

  const handleExport = async () => {
    if (selectedLanguages.length === 0) {
      toast({
        title: tc("toast.error"),
        description: t("export.selectAtLeastOne"),
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

      if (format === "json" && useNestedNamespaces) {
        params.append("nested", "true");
      }

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
        title: tc("toast.success"),
        description: t("export.exported"),
      });
    } catch (error) {
      toast({
        title: tc("toast.error"),
        description: t("export.failedExport"),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
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
        <h1 className="text-3xl font-semibold mb-2">{t("export.title")}</h1>
        <p className="text-muted-foreground">
          {t("export.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("export.selectFormat")}</CardTitle>
          <CardDescription>{t("export.selectFormatDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={format}
            onValueChange={(v) => setFormat(v as "json" | "csv")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="json"
                id="json-export"
                data-testid="radio-format-json"
              />
              <Label
                htmlFor="json-export"
                className="flex items-center gap-2 cursor-pointer"
              >
                <FileJson className="h-4 w-4" />
                {t("export.jsonFormat")}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="csv"
                id="csv-export"
                data-testid="radio-format-csv"
              />
              <Label
                htmlFor="csv-export"
                className="flex items-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {t("export.csvFormat")}
              </Label>
            </div>
          </RadioGroup>

          {format === "json" && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="nested-namespaces"
                  checked={useNestedNamespaces}
                  onCheckedChange={(checked) =>
                    setUseNestedNamespaces(checked as boolean)
                  }
                  data-testid="checkbox-nested-namespaces"
                />
                <Label
                  htmlFor="nested-namespaces"
                  className="cursor-pointer font-normal"
                >
                  {t("export.nestedNamespaces")}
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("export.nestedNamespacesDesc")}
                  </p>
                </Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("export.selectLanguages")}</CardTitle>
          <CardDescription>
            {t("export.selectLanguagesDesc")}
          </CardDescription>
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
                  <span className="text-sm text-muted-foreground">
                    {lang.languageName}
                  </span>
                  {lang.isDefault && (
                    <span className="text-xs text-muted-foreground">
                      ({tc("labels.default")})
                    </span>
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
          {isExporting ? tc("actions.exporting") : t("export.title")}
        </Button>
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          data-testid="button-cancel"
        >
          {tc("actions.cancel")}
        </Button>
      </div>
    </div>
  );
}
