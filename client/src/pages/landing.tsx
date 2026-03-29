import { Button } from "@/components/ui/button";
import { Languages, Globe2, Users, FileText, Zap, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Landing() {
  const { t } = useTranslation("landing");
  const { t: tc } = useTranslation("common");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="relative">
          <header className="border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Languages className="h-6 w-6 text-primary" />
                <span className="text-xl font-semibold">{tc("brand")}</span>
              </div>
              <Button asChild data-testid="button-login">
                <a href="/api/login">{t("signIn")}</a>
              </Button>
            </div>
          </header>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl font-bold tracking-tight mb-6">
                {t("hero.title1")}
                <span className="block text-primary mt-2">{t("hero.title2")}</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                {t("hero.subtitle")}
              </p>
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/api/login" className="text-base px-8">
                  {t("hero.cta")}
                </a>
              </Button>
            </div>

            {/* Feature Grid */}
            <div className="grid md:grid-cols-3 gap-8 mt-24">
              <div className="p-6 rounded-lg border border-border bg-card hover-elevate">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Globe2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t("features.multiProject")}</h3>
                <p className="text-muted-foreground text-sm">
                  {t("features.multiProjectDesc")}
                </p>
              </div>

              <div className="p-6 rounded-lg border border-border bg-card hover-elevate">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t("features.collaborative")}</h3>
                <p className="text-muted-foreground text-sm">
                  {t("features.collaborativeDesc")}
                </p>
              </div>

              <div className="p-6 rounded-lg border border-border bg-card hover-elevate">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t("features.importExport")}</h3>
                <p className="text-muted-foreground text-sm">
                  {t("features.importExportDesc")}
                </p>
              </div>

              <div className="p-6 rounded-lg border border-border bg-card hover-elevate">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t("features.aiTranslation")}</h3>
                <p className="text-muted-foreground text-sm">
                  {t("features.aiTranslationDesc")}
                </p>
              </div>

              <div className="p-6 rounded-lg border border-border bg-card hover-elevate">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t("features.versionControl")}</h3>
                <p className="text-muted-foreground text-sm">
                  {t("features.versionControlDesc")}
                </p>
              </div>

              <div className="p-6 rounded-lg border border-border bg-card hover-elevate">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Languages className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t("features.multiLanguage")}</h3>
                <p className="text-muted-foreground text-sm">
                  {t("features.multiLanguageDesc")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
