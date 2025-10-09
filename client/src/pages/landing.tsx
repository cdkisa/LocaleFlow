import { Button } from "@/components/ui/button";
import { Languages, Globe2, Users, FileText, Zap, Shield } from "lucide-react";

export default function Landing() {
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
                <span className="text-xl font-semibold">LocaleFlow</span>
              </div>
              <Button asChild data-testid="button-login">
                <a href="/api/login">Sign In</a>
              </Button>
            </div>
          </header>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl font-bold tracking-tight mb-6">
                Localization Management
                <span className="block text-primary mt-2">Made Simple</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Manage translations across multiple projects and languages with collaborative workflows, 
                version control, and seamless import/export capabilities.
              </p>
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/api/login" className="text-base px-8">
                  Get Started Free
                </a>
              </Button>
            </div>

            {/* Feature Grid */}
            <div className="grid md:grid-cols-3 gap-8 mt-24">
              <div className="p-6 rounded-lg border border-border bg-card hover-elevate">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Globe2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Multi-Project Support</h3>
                <p className="text-muted-foreground text-sm">
                  Organize and manage translations for multiple projects from a single dashboard.
                </p>
              </div>

              <div className="p-6 rounded-lg border border-border bg-card hover-elevate">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Collaborative Workflow</h3>
                <p className="text-muted-foreground text-sm">
                  Work together with developers, translators, and reviewers with role-based permissions.
                </p>
              </div>

              <div className="p-6 rounded-lg border border-border bg-card hover-elevate">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Import & Export</h3>
                <p className="text-muted-foreground text-sm">
                  Seamlessly import and export translations in JSON and CSV formats.
                </p>
              </div>

              <div className="p-6 rounded-lg border border-border bg-card hover-elevate">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">AI Translation</h3>
                <p className="text-muted-foreground text-sm">
                  Get instant translation suggestions powered by Google Translate API.
                </p>
              </div>

              <div className="p-6 rounded-lg border border-border bg-card hover-elevate">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Version Control</h3>
                <p className="text-muted-foreground text-sm">
                  Track translation history and status with draft, review, and approved states.
                </p>
              </div>

              <div className="p-6 rounded-lg border border-border bg-card hover-elevate">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Languages className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Multi-Language</h3>
                <p className="text-muted-foreground text-sm">
                  Support for any language including regional variants like French Canadian.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
