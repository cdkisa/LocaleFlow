import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Users,
  Plus,
  Trash2,
  Globe,
  Star,
  Edit2,
  ArrowLeft,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { cn } from "@/lib/utils";
import type { Project, ProjectLanguage } from "@shared/schema";

type ProjectMember = {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  } | null;
};

export default function ProjectSettings() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation("project");
  const { t: tc } = useTranslation("common");

  // Member state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("translator");

  // Language state
  const [languageCode, setLanguageCode] = useState("");
  const [languageName, setLanguageName] = useState("");
  const [editingLanguage, setEditingLanguage] =
    useState<ProjectLanguage | null>(null);
  const [languageComboboxOpen, setLanguageComboboxOpen] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");

  // Project name state
  const [editingProjectName, setEditingProjectName] = useState<string | null>(
    null
  );

  // Project description state
  const [editingDescription, setEditingDescription] = useState<string | null>(
    null
  );

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", id],
  });

  const { data: members = [] } = useQuery<ProjectMember[]>({
    queryKey: ["/api/projects", id, "members"],
  });

  const { data: languages = [] } = useQuery<ProjectLanguage[]>({
    queryKey: ["/api/projects", id, "languages"],
  });

  // Culture codes query for autocomplete
  type CultureCode = { code: string; name: string };
  const { data: cultureCodes = [] } = useQuery<CultureCode[]>({
    queryKey: ["/api/culture-codes", languageSearch],
    queryFn: async () => {
      const params = languageSearch
        ? new URLSearchParams({ search: languageSearch })
        : "";
      const res = await apiRequest(
        "GET",
        `/api/culture-codes${params ? `?${params}` : ""}`
      );
      return await res.json();
    },
  });

  // Member mutations
  const addMemberMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      return await apiRequest("POST", `/api/projects/${id}/members`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", id, "members"],
      });
      toast({
        title: tc("toast.success"),
        description: t("toast.memberAdded"),
      });
      setEmail("");
      setRole("translator");
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
        description: error.message || t("toast.failedAddMember"),
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return await apiRequest(
        "DELETE",
        `/api/projects/${id}/members/${memberId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", id, "members"],
      });
      toast({
        title: tc("toast.success"),
        description: t("toast.memberRemoved"),
      });
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
        description: error.message || t("toast.failedRemoveMember"),
        variant: "destructive",
      });
    },
  });

  // Language mutations
  const addLanguageMutation = useMutation({
    mutationFn: async (data: {
      languageCode: string;
      languageName: string;
    }) => {
      return await apiRequest("POST", `/api/projects/${id}/languages`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", id, "languages"],
      });
      toast({
        title: tc("toast.success"),
        description: t("toast.languageAdded"),
      });
      setLanguageCode("");
      setLanguageName("");
      setLanguageSearch("");
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
        description: error.message || t("toast.failedAddLanguage"),
        variant: "destructive",
      });
    },
  });

  const updateLanguageMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      languageCode: string;
      languageName: string;
    }) => {
      return await apiRequest(
        "PUT",
        `/api/projects/${id}/languages/${data.id}`,
        {
          languageCode: data.languageCode,
          languageName: data.languageName,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", id, "languages"],
      });
      toast({
        title: tc("toast.success"),
        description: t("toast.languageUpdated"),
      });
      setEditingLanguage(null);
    },
    onError: (error: Error) => {
      toast({
        title: tc("toast.error"),
        description: error.message || t("toast.failedUpdateLanguage"),
        variant: "destructive",
      });
    },
  });

  const setDefaultLanguageMutation = useMutation({
    mutationFn: async (languageId: string) => {
      return await apiRequest(
        "POST",
        `/api/projects/${id}/languages/${languageId}/set-default`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", id, "languages"],
      });
      toast({
        title: tc("toast.success"),
        description: t("toast.defaultLanguageUpdated"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: tc("toast.error"),
        description: error.message || t("toast.failedSetDefaultLanguage"),
        variant: "destructive",
      });
    },
  });

  const deleteLanguageMutation = useMutation({
    mutationFn: async (languageId: string) => {
      return await apiRequest(
        "DELETE",
        `/api/projects/${id}/languages/${languageId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", id, "languages"],
      });
      toast({
        title: tc("toast.success"),
        description: t("toast.languageRemoved"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: tc("toast.error"),
        description: error.message || t("toast.failedRemoveLanguage"),
        variant: "destructive",
      });
    },
  });

  // Project name mutation
  const updateProjectNameMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("PATCH", `/api/projects/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", id],
      });
      toast({
        title: tc("toast.success"),
        description: t("toast.projectNameUpdated"),
      });
      setEditingProjectName(null);
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
        description: error.message || t("toast.failedUpdateProjectName"),
        variant: "destructive",
      });
    },
  });

  // Project description mutation
  const updateProjectDescriptionMutation = useMutation({
    mutationFn: async (description: string) => {
      return await apiRequest("PATCH", `/api/projects/${id}`, { description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", id],
      });
      toast({
        title: tc("toast.success"),
        description: t("toast.projectDescUpdated"),
      });
      setEditingDescription(null);
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
        description: error.message || t("toast.failedUpdateProjectDesc"),
        variant: "destructive",
      });
    },
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-primary text-primary-foreground";
      case "developer":
        return "bg-chart-1 text-white";
      case "translator":
        return "bg-chart-3 text-white";
      case "reviewer":
        return "bg-chart-4 text-white";
      default:
        return "";
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
        <h1 className="text-3xl font-semibold mb-2">{t("settings.title")}</h1>
      </div>

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.projectDetails")}</CardTitle>
          <CardDescription>{t("settings.projectDetailsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">{tc("labels.projectName")}</Label>
              <div className="flex items-center gap-2">
                {editingProjectName !== null ? (
                  <>
                    <Input
                      id="projectName"
                      value={editingProjectName}
                      onChange={(e) => setEditingProjectName(e.target.value)}
                      className="flex-1"
                      data-testid="input-project-name"
                    />
                    <Button
                      size="sm"
                      onClick={() =>
                        updateProjectNameMutation.mutate(editingProjectName)
                      }
                      disabled={
                        !editingProjectName.trim() ||
                        updateProjectNameMutation.isPending ||
                        editingProjectName === project?.name
                      }
                      data-testid="button-save-project-name"
                    >
                      {tc("actions.save")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingProjectName(null);
                      }}
                      data-testid="button-cancel-project-name"
                    >
                      {tc("actions.cancel")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Input
                      id="projectName"
                      value={project?.name || ""}
                      readOnly
                      className="flex-1 bg-muted"
                      data-testid="display-project-name"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingProjectName(project?.name || "")}
                      data-testid="button-edit-project-name"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectDescription">{tc("labels.description")}</Label>
              <div className="space-y-2">
                {editingDescription !== null ? (
                  <>
                    <Textarea
                      id="projectDescription"
                      value={editingDescription}
                      onChange={(e) => setEditingDescription(e.target.value)}
                      placeholder={t("settings.descriptionPlaceholder")}
                      className="min-h-[100px]"
                      data-testid="input-project-description"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          updateProjectDescriptionMutation.mutate(
                            editingDescription
                          )
                        }
                        disabled={
                          updateProjectDescriptionMutation.isPending ||
                          editingDescription === (project?.description || "")
                        }
                        data-testid="button-save-project-description"
                      >
                        {tc("actions.save")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingDescription(null);
                        }}
                        data-testid="button-cancel-project-description"
                      >
                        {tc("actions.cancel")}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start gap-2">
                    <Textarea
                      id="projectDescription"
                      value={project?.description || ""}
                      readOnly
                      className="flex-1 bg-muted min-h-[100px]"
                      placeholder={t("settings.noDescription")}
                      data-testid="display-project-description"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setEditingDescription(project?.description || "")
                      }
                      data-testid="button-edit-project-description"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("settings.languagesTitle")}
          </CardTitle>
          <CardDescription>
            {t("settings.languagesDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Language Form */}
          <div className="p-4 border rounded-lg space-y-4">
            <h3 className="font-medium">{t("settings.addLanguage")}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language-select">{t("settings.selectLanguage")}</Label>
                <Popover
                  open={languageComboboxOpen}
                  onOpenChange={setLanguageComboboxOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={languageComboboxOpen}
                      className="w-full justify-between"
                      data-testid="button-language-combobox"
                    >
                      {languageCode && languageName
                        ? `${languageName} (${languageCode})`
                        : t("settings.selectLanguagePlaceholder")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder={t("settings.searchLanguages")}
                        value={languageSearch}
                        onValueChange={setLanguageSearch}
                        data-testid="input-language-search"
                      />
                      <CommandList>
                        <CommandEmpty>{t("settings.noLanguageFound")}</CommandEmpty>
                        <CommandGroup>
                          {cultureCodes.filter((culture) => !languages.find((l) => l.languageCode === culture.code)).map((culture) => (
                            <CommandItem
                              key={culture.code}
                              value={`${culture.name} ${culture.code}`}
                              onSelect={() => {
                                setLanguageCode(culture.code);
                                setLanguageName(culture.name);
                                setLanguageComboboxOpen(false);
                                setLanguageSearch("");
                              }}
                              data-testid={`option-language-${culture.code}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  languageCode === culture.code
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{culture.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {culture.code}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {(languageCode || languageName) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="languageCode">{tc("labels.languageCode")}</Label>
                    <Input
                      id="languageCode"
                      placeholder={t("settings.languageCodePlaceholder")}
                      value={languageCode}
                      onChange={(e) => setLanguageCode(e.target.value)}
                      data-testid="input-language-code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="languageName">{tc("labels.languageName")}</Label>
                    <Input
                      id="languageName"
                      placeholder={t("settings.languageNamePlaceholder")}
                      value={languageName}
                      onChange={(e) => setLanguageName(e.target.value)}
                      data-testid="input-language-name"
                    />
                  </div>
                </div>
              )}
            </div>
            <Button
              onClick={() =>
                addLanguageMutation.mutate({ languageCode, languageName })
              }
              disabled={
                !languageCode || !languageName || addLanguageMutation.isPending
              }
              className="w-full sm:w-auto"
              data-testid="button-add-language"
            >
              <Plus className="mr-2 h-4 w-4" />
              {addLanguageMutation.isPending ? tc("actions.adding") : tc("actions.addLanguage")}
            </Button>
          </div>

          {/* Languages List */}
          <div className="space-y-3">
            <h3 className="font-medium">{t("settings.currentLanguages")}</h3>
            <div className="space-y-2">
              {languages.map((language) => (
                <div
                  key={language.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                  data-testid={`language-${language.id}`}
                >
                  <div className="flex items-center gap-3">
                    {editingLanguage?.id === language.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={editingLanguage.languageCode}
                          onChange={(e) =>
                            setEditingLanguage({
                              ...editingLanguage,
                              languageCode: e.target.value,
                            })
                          }
                          className="w-24"
                          data-testid="input-edit-language-code"
                        />
                        <Input
                          value={editingLanguage.languageName}
                          onChange={(e) =>
                            setEditingLanguage({
                              ...editingLanguage,
                              languageName: e.target.value,
                            })
                          }
                          className="w-40"
                          data-testid="input-edit-language-name"
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">
                          {language.languageName}
                          {language.isDefault && (
                            <Badge
                              variant="outline"
                              className="ml-2"
                              data-testid="badge-default"
                            >
                              <Star className="h-3 w-3 mr-1" />
                              {tc("labels.default")}
                            </Badge>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {language.languageCode}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingLanguage?.id === language.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            updateLanguageMutation.mutate({
                              id: editingLanguage.id,
                              languageCode: editingLanguage.languageCode,
                              languageName: editingLanguage.languageName,
                            })
                          }
                          disabled={updateLanguageMutation.isPending}
                          data-testid="button-save-language"
                        >
                          {tc("actions.save")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingLanguage(null)}
                          data-testid="button-cancel-edit"
                        >
                          {tc("actions.cancel")}
                        </Button>
                      </>
                    ) : (
                      <>
                        {!language.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setDefaultLanguageMutation.mutate(language.id)
                            }
                            disabled={setDefaultLanguageMutation.isPending}
                            data-testid={`button-set-default-${language.id}`}
                          >
                            <Star className="h-4 w-4 mr-1" />
                            {t("settings.setDefault")}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingLanguage(language)}
                          data-testid={`button-edit-language-${language.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            deleteLanguageMutation.mutate(language.id)
                          }
                          disabled={deleteLanguageMutation.isPending}
                          data-testid={`button-delete-language-${language.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {languages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t("settings.noLanguages")}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("settings.teamMembers")}
          </CardTitle>
          <CardDescription>
            {t("settings.teamMembersDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Member Form */}
          <div className="p-4 border rounded-lg space-y-4">
            <h3 className="font-medium">{t("settings.addTeamMember")}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">{tc("labels.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("settings.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-member-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{tc("labels.role")}</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role" data-testid="select-member-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="developer">{tc("roles.developer")}</SelectItem>
                    <SelectItem value="translator">{tc("roles.translator")}</SelectItem>
                    <SelectItem value="reviewer">{tc("roles.reviewer")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => addMemberMutation.mutate({ email, role })}
              disabled={!email || addMemberMutation.isPending}
              className="w-full sm:w-auto"
              data-testid="button-add-member"
            >
              <Plus className="mr-2 h-4 w-4" />
              {addMemberMutation.isPending ? tc("actions.adding") : tc("actions.addMember")}
            </Button>
          </div>

          {/* Members List */}
          <div className="space-y-3">
            <h3 className="font-medium">{t("settings.currentMembers")}</h3>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                  data-testid={`member-${member.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.user?.profileImageUrl} />
                      <AvatarFallback>
                        {member.user?.firstName?.[0] ||
                          member.user?.email?.[0] ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.user?.firstName && member.user?.lastName
                          ? `${member.user.firstName} ${member.user.lastName}`
                          : member.user?.email || "Unknown User"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      className={getRoleBadgeColor(member.role)}
                      data-testid={`badge-role-${member.id}`}
                    >
                      {member.role}
                    </Badge>
                    {member.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMemberMutation.mutate(member.id)}
                        disabled={removeMemberMutation.isPending}
                        data-testid={`button-remove-member-${member.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t("settings.noMembers")}
                </p>
              )}
            </div>
          </div>

          {/* Role Descriptions */}
          <div className="space-y-2 pt-4 border-t">
            <h3 className="font-medium">{t("settings.rolePermissions")}</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tc("roles.developer")}</span>
                <span>{t("settings.developerDesc")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tc("roles.translator")}</span>
                <span>{t("settings.translatorDesc")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tc("roles.reviewer")}</span>
                <span>{t("settings.reviewerDesc")}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
