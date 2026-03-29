import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Plus, X, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { cn } from "@/lib/utils";

interface Language {
  code: string;
  name: string;
}

export default function NewProject() {
  const { t } = useTranslation("project");
  const { t: tc } = useTranslation("common");

  const projectSchema = z.object({
    name: z.string().min(1, tc("validation.nameRequired")).max(255),
    description: z.string().optional(),
  });

  type ProjectFormData = z.infer<typeof projectSchema>;

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [languages, setLanguages] = useState<Language[]>([
    { code: "en", name: "English" },
  ]);
  const [languageComboboxOpen, setLanguageComboboxOpen] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Culture codes query for autocomplete
  type CultureCode = { code: string; name: string };
  const {
    data: cultureCodes = [],
    isLoading: isLoadingCultureCodes,
    error: cultureCodesError,
    refetch: refetchCultureCodes,
  } = useQuery<CultureCode[]>({
    queryKey: ["/api/culture-codes", languageSearch],
    queryFn: async () => {
      try {
        const params = languageSearch
          ? new URLSearchParams({ search: languageSearch })
          : "";
        const res = await apiRequest(
          "GET",
          `/api/culture-codes${params ? `?${params}` : ""}`
        );
        const data = await res.json();
        if (!Array.isArray(data)) {
          console.error("Culture codes API returned non-array:", data);
          return [];
        }
        return data;
      } catch (error) {
        console.error("Error fetching culture codes:", error);
        throw error;
      }
    },
    enabled: true,
  });

  // Log errors for debugging
  if (cultureCodesError) {
    console.error("Culture codes query error:", cultureCodesError);
  }

  const createProject = useMutation({
    mutationFn: async (data: ProjectFormData & { languages: Language[] }) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: tc("toast.success"),
        description: tc("toast.success"),
      });
      setLocation(`/projects/${data.id}`);
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
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const addLanguage = (code: string, name: string) => {
    if (languages.find((l) => l.code === code)) {
      toast({
        title: tc("toast.error"),
        description: t("new.languageExists"),
        variant: "destructive",
      });
      return;
    }
    setLanguages([...languages, { code, name }]);
    setLanguageSearch("");
  };

  const removeLanguage = (code: string) => {
    setLanguages(languages.filter((l) => l.code !== code));
  };

  const onSubmit = (data: ProjectFormData) => {
    if (languages.length === 0) {
      toast({
        title: tc("toast.error"),
        description: t("new.atLeastOneLanguage"),
        variant: "destructive",
      });
      return;
    }
    createProject.mutate({ ...data, languages });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">{t("new.title")}</h1>
        <p className="text-muted-foreground">
          {t("new.subtitle")}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("new.projectDetails")}</CardTitle>
              <CardDescription>
                {t("new.projectDetailsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tc("labels.projectName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("new.placeholder.name")}
                        {...field}
                        data-testid="input-project-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("new.descriptionOptional")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("new.placeholder.description")}
                        {...field}
                        data-testid="input-project-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("new.languagesTitle")}</CardTitle>
              <CardDescription>{t("new.languagesDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <div
                    key={lang.code}
                    className="flex items-center gap-2 px-3 py-1 bg-accent rounded-md"
                    data-testid={`badge-language-${lang.code}`}
                  >
                    <span className="text-sm font-mono">{lang.code}</span>
                    <span className="text-sm">-</span>
                    <span className="text-sm">{lang.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4"
                      onClick={() => removeLanguage(lang.code)}
                      data-testid={`button-remove-language-${lang.code}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Popover
                  open={languageComboboxOpen}
                  onOpenChange={(open) => {
                    setLanguageComboboxOpen(open);
                    if (open) {
                      // Reset search when opening to show all languages
                      setLanguageSearch("");
                      // Refetch culture codes when opening
                      refetchCultureCodes();
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={languageComboboxOpen}
                      className="w-full justify-between"
                      data-testid="button-language-combobox"
                    >
                      {t("new.selectLanguage")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder={t("new.searchLanguages")}
                        value={languageSearch}
                        onValueChange={setLanguageSearch}
                        data-testid="input-language-search"
                      />
                      <CommandList>
                        {isLoadingCultureCodes ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            {t("new.loadingLanguages")}
                          </div>
                        ) : cultureCodesError ? (
                          <div className="py-6 text-center text-sm text-destructive">
                            {t("new.errorLoadingLanguages")}
                          </div>
                        ) : (
                          <>
                            <CommandEmpty>{t("new.noLanguageFound")}</CommandEmpty>
                            <CommandGroup>
                              {cultureCodes
                                .filter(
                                  (culture) =>
                                    !languages.find(
                                      (l) => l.code === culture.code
                                    )
                                )
                                .map((culture) => (
                                  <CommandItem
                                    key={culture.code}
                                    value={`${culture.name} ${culture.code}`}
                                    onSelect={() => {
                                      addLanguage(culture.code, culture.name);
                                      setLanguageComboboxOpen(false);
                                      setLanguageSearch("");
                                    }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      addLanguage(culture.code, culture.name);
                                      setLanguageComboboxOpen(false);
                                      setLanguageSearch("");
                                    }}
                                    data-testid={`option-language-${culture.code}`}
                                  >
                                    <Check className="mr-2 h-4 w-4 opacity-0" />
                                    <div className="flex flex-col">
                                      <span>{culture.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {culture.code}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={createProject.isPending}
              data-testid="button-create-project-submit"
            >
              {createProject.isPending ? tc("actions.creating") : tc("actions.createProject")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/")}
              data-testid="button-cancel"
            >
              {tc("actions.cancel")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
