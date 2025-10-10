import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Users, Plus, Trash2, Globe, Star, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
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
  
  // Member state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("translator");
  
  // Language state
  const [languageCode, setLanguageCode] = useState("");
  const [languageName, setLanguageName] = useState("");
  const [editingLanguage, setEditingLanguage] = useState<ProjectLanguage | null>(null);

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", id],
  });

  const { data: members = [] } = useQuery<ProjectMember[]>({
    queryKey: ["/api/projects", id, "members"],
  });

  const { data: languages = [] } = useQuery<ProjectLanguage[]>({
    queryKey: ["/api/projects", id, "languages"],
  });

  // Member mutations
  const addMemberMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      return await apiRequest("POST", `/api/projects/${id}/members`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "members"] });
      toast({
        title: "Success",
        description: "Member added successfully",
      });
      setEmail("");
      setRole("translator");
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
        description: error.message || "Failed to add member",
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return await apiRequest("DELETE", `/api/projects/${id}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "members"] });
      toast({
        title: "Success",
        description: "Member removed successfully",
      });
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
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    },
  });

  // Language mutations
  const addLanguageMutation = useMutation({
    mutationFn: async (data: { languageCode: string; languageName: string }) => {
      return await apiRequest("POST", `/api/projects/${id}/languages`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "languages"] });
      toast({
        title: "Success",
        description: "Language added successfully",
      });
      setLanguageCode("");
      setLanguageName("");
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
        description: error.message || "Failed to add language",
        variant: "destructive",
      });
    },
  });

  const updateLanguageMutation = useMutation({
    mutationFn: async (data: { id: string; languageCode: string; languageName: string }) => {
      return await apiRequest("PUT", `/api/projects/${id}/languages/${data.id}`, {
        languageCode: data.languageCode,
        languageName: data.languageName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "languages"] });
      toast({
        title: "Success",
        description: "Language updated successfully",
      });
      setEditingLanguage(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update language",
        variant: "destructive",
      });
    },
  });

  const setDefaultLanguageMutation = useMutation({
    mutationFn: async (languageId: string) => {
      return await apiRequest("POST", `/api/projects/${id}/languages/${languageId}/set-default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "languages"] });
      toast({
        title: "Success",
        description: "Default language updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set default language",
        variant: "destructive",
      });
    },
  });

  const deleteLanguageMutation = useMutation({
    mutationFn: async (languageId: string) => {
      return await apiRequest("DELETE", `/api/projects/${id}/languages/${languageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "languages"] });
      toast({
        title: "Success",
        description: "Language removed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove language",
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
        <h1 className="text-3xl font-semibold mb-2">Project Settings</h1>
        <p className="text-muted-foreground">{project?.name}</p>
      </div>

      {/* Language Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Languages
          </CardTitle>
          <CardDescription>
            Manage the languages available for translation in this project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Language Form */}
          <div className="p-4 border rounded-lg space-y-4">
            <h3 className="font-medium">Add Language</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="languageCode">Language Code</Label>
                <Input
                  id="languageCode"
                  placeholder="en, fr, fr-CA"
                  value={languageCode}
                  onChange={(e) => setLanguageCode(e.target.value)}
                  data-testid="input-language-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="languageName">Language Name</Label>
                <Input
                  id="languageName"
                  placeholder="English, French, French Canadian"
                  value={languageName}
                  onChange={(e) => setLanguageName(e.target.value)}
                  data-testid="input-language-name"
                />
              </div>
            </div>
            <Button
              onClick={() => addLanguageMutation.mutate({ languageCode, languageName })}
              disabled={!languageCode || !languageName || addLanguageMutation.isPending}
              className="w-full sm:w-auto"
              data-testid="button-add-language"
            >
              <Plus className="mr-2 h-4 w-4" />
              {addLanguageMutation.isPending ? "Adding..." : "Add Language"}
            </Button>
          </div>

          {/* Languages List */}
          <div className="space-y-3">
            <h3 className="font-medium">Current Languages</h3>
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
                            setEditingLanguage({ ...editingLanguage, languageCode: e.target.value })
                          }
                          className="w-24"
                          data-testid="input-edit-language-code"
                        />
                        <Input
                          value={editingLanguage.languageName}
                          onChange={(e) =>
                            setEditingLanguage({ ...editingLanguage, languageName: e.target.value })
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
                            <Badge variant="outline" className="ml-2" data-testid="badge-default">
                              <Star className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">{language.languageCode}</p>
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
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingLanguage(null)}
                          data-testid="button-cancel-edit"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        {!language.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDefaultLanguageMutation.mutate(language.id)}
                            disabled={setDefaultLanguageMutation.isPending}
                            data-testid={`button-set-default-${language.id}`}
                          >
                            <Star className="h-4 w-4 mr-1" />
                            Set Default
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
                          onClick={() => deleteLanguageMutation.mutate(language.id)}
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
                  No languages configured. Add your first language above.
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
            Team Members
          </CardTitle>
          <CardDescription>
            Manage who has access to this project and their roles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Member Form */}
          <div className="p-4 border rounded-lg space-y-4">
            <h3 className="font-medium">Add Team Member</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-member-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role" data-testid="select-member-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="developer">Developer</SelectItem>
                    <SelectItem value="translator">Translator</SelectItem>
                    <SelectItem value="reviewer">Reviewer</SelectItem>
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
              {addMemberMutation.isPending ? "Adding..." : "Add Member"}
            </Button>
          </div>

          {/* Members List */}
          <div className="space-y-3">
            <h3 className="font-medium">Current Members</h3>
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
                        {member.user?.firstName?.[0] || member.user?.email?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.user?.firstName && member.user?.lastName
                          ? `${member.user.firstName} ${member.user.lastName}`
                          : member.user?.email || "Unknown User"}
                      </p>
                      <p className="text-sm text-muted-foreground">{member.user?.email}</p>
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
                  No team members yet. Add your first team member above.
                </p>
              )}
            </div>
          </div>

          {/* Role Descriptions */}
          <div className="space-y-2 pt-4 border-t">
            <h3 className="font-medium">Role Permissions</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Developer</span>
                <span>Full access to keys and translations</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Translator</span>
                <span>Can create and edit translations</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reviewer</span>
                <span>View-only access</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
