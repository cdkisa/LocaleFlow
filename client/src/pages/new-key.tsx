import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { z } from "zod";
import { useTranslation } from "react-i18next";
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

type KeyFormData = z.infer<ReturnType<typeof makeKeySchema>>;

function makeKeySchema(tc: (key: string) => string) {
  return z.object({
    key: z.string().min(1, tc("validation.keyRequired")).max(500),
    description: z.string().optional(),
  });
}

export default function NewKey() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation("project");
  const { t: tc } = useTranslation("common");

  const keySchema = makeKeySchema(tc);

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
        title: tc("toast.success"),
        description: t("toast.keyCreated"),
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
        description: error.message || t("toast.failedCreateKey"),
        variant: "destructive",
      });
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">{t("newKey.title")}</h1>
        <p className="text-muted-foreground">
          {t("newKey.subtitle")}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => createKey.mutate(data))} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("newKey.keyDetails")}</CardTitle>
              <CardDescription>{t("newKey.keyDetailsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tc("labels.key")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("newKey.keyPlaceholder")}
                        className="font-mono"
                        {...field}
                        data-testid="input-key"
                      />
                    </FormControl>
                    <FormDescription>
                      {t("newKey.keyFormatHelp")}
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
                    <FormLabel>{t("newKey.descriptionOptional")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("newKey.descriptionPlaceholder")}
                        {...field}
                        data-testid="input-key-description"
                      />
                    </FormControl>
                    <FormDescription>
                      {t("newKey.descriptionHelp")}
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
              {createKey.isPending ? tc("actions.creating") : t("newKey.createKey")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation(`/projects/${id}`)}
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
