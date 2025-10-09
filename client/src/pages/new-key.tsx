import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { z } from "zod";
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
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const keySchema = z.object({
  key: z.string().min(1, "Key is required").max(500),
  description: z.string().optional(),
});

type KeyFormData = z.infer<typeof keySchema>;

export default function NewKey() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<KeyFormData>({
    resolver: zodResolver(keySchema),
    defaultValues: {
      key: "",
      description: "",
    },
  });

  const createKey = useMutation({
    mutationFn: async (data: KeyFormData) => {
      return await apiRequest("POST", "/api/translation-keys", {
        ...data,
        projectId: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "keys"] });
      toast({
        title: "Success",
        description: "Translation key created",
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
        description: error.message || "Failed to create key",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Add Translation Key</h1>
        <p className="text-muted-foreground">
          Create a new key that can be translated into all project languages
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => createKey.mutate(data))} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Key Details</CardTitle>
              <CardDescription>Define the translation key and provide context</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="home.welcome.title"
                        className="font-mono"
                        {...field}
                        data-testid="input-key"
                      />
                    </FormControl>
                    <FormDescription>
                      Use dot notation for namespacing (e.g., home.welcome.title)
                    </FormDescription>
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
                        placeholder="Provide context for translators..."
                        {...field}
                        data-testid="input-key-description"
                      />
                    </FormControl>
                    <FormDescription>
                      Help translators understand the context and usage
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={createKey.isPending}
              data-testid="button-create-key"
            >
              {createKey.isPending ? "Creating..." : "Create Key"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation(`/projects/${id}`)}
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
