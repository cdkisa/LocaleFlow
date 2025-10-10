import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(255),
  description: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface Language {
  code: string;
  name: string;
}

export default function NewProject() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [languages, setLanguages] = useState<Language[]>([
    { code: "en", name: "English" },
  ]);
  const [newLangCode, setNewLangCode] = useState("");
  const [newLangName, setNewLangName] = useState("");

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const createProject = useMutation({
    mutationFn: async (data: ProjectFormData & { languages: Language[] }) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      setLocation(`/projects/${data.id}`);
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
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const addLanguage = () => {
    if (newLangCode && newLangName) {
      if (languages.find(l => l.code === newLangCode)) {
        toast({
          title: "Error",
          description: "Language code already exists",
          variant: "destructive",
        });
        return;
      }
      setLanguages([...languages, { code: newLangCode, name: newLangName }]);
      setNewLangCode("");
      setNewLangName("");
    }
  };

  const removeLanguage = (code: string) => {
    setLanguages(languages.filter((l) => l.code !== code));
  };

  const onSubmit = (data: ProjectFormData) => {
    if (languages.length === 0) {
      toast({
        title: "Error",
        description: "At least one language is required",
        variant: "destructive",
      });
      return;
    }
    createProject.mutate({ ...data, languages });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Create New Project</h1>
        <p className="text-muted-foreground">
          Set up a new localization project with languages and team members
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Basic information about your project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="My App"
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your project..."
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
              <CardTitle>Languages</CardTitle>
              <CardDescription>Add languages for your project</CardDescription>
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

              <div className="flex gap-2">
                <Input
                  placeholder="Code (e.g., fr-CA)"
                  value={newLangCode}
                  onChange={(e) => setNewLangCode(e.target.value)}
                  className="font-mono"
                  data-testid="input-language-code"
                />
                <Input
                  placeholder="Name (e.g., French Canadian)"
                  value={newLangName}
                  onChange={(e) => setNewLangName(e.target.value)}
                  data-testid="input-language-name"
                />
                <Button
                  type="button"
                  onClick={addLanguage}
                  variant="outline"
                  data-testid="button-add-language"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={createProject.isPending}
              data-testid="button-create-project-submit"
            >
              {createProject.isPending ? "Creating..." : "Create Project"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/")}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
