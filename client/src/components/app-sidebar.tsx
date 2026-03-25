import React from "react";
import {
  Home,
  FolderOpen,
  Settings,
  LogOut,
  Languages,
  ChevronRight,
  Key,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import type { Project } from "@shared/schema";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [projectsOpen, setProjectsOpen] = React.useState(true);
  const { t, i18n } = useTranslation();

  const menuItems = [
    {
      title: t("nav.dashboard"),
      url: "/",
      icon: Home,
    },
    {
      title: "API Keys",
      url: "/api-keys",
      icon: Key,
    },
  ];

  // Fetch projects for the sidebar
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<
    Project[]
  >({
    queryKey: ["/api/projects"],
  });

  // Check if current location is a project page
  const isProjectPage =
    location.startsWith("/projects/") && location !== "/projects/new";
  const currentProjectId = isProjectPage
    ? location.split("/projects/")[1]
    : null;

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 px-4 py-3">
            <Languages className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold">{t("brand")}</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Projects Collapsible Menu */}
              <Collapsible
                asChild
                open={projectsOpen}
                onOpenChange={setProjectsOpen}
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isProjectPage}
                      data-testid="nav-projects"
                    >
                      <FolderOpen className="h-4 w-4" />
                      <span>{t("nav.projects")}</span>
                      <ChevronRight
                        className={cn(
                          "ml-auto h-4 w-4 transition-transform",
                          projectsOpen && "rotate-90"
                        )}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {isLoadingProjects ? (
                        <>
                          {[1, 2, 3].map((i) => (
                            <SidebarMenuSubItem key={i}>
                              <Skeleton className="h-7 w-full" />
                            </SidebarMenuSubItem>
                          ))}
                        </>
                      ) : projects.length > 0 ? (
                        projects.map((project) => (
                          <SidebarMenuSubItem key={project.id}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={currentProjectId === project.id}
                              data-testid={`nav-project-${project.id}`}
                            >
                              <Link href={`/projects/${project.id}`}>
                                <span className="truncate">{project.name}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))
                      ) : (
                        <SidebarMenuSubItem>
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            {t("noProjectsYet")}
                          </div>
                        </SidebarMenuSubItem>
                      )}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user?.profileImageUrl || undefined}
              className="object-cover"
            />
            <AvatarFallback className="text-xs">
              {user?.firstName?.[0] || user?.email?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium truncate"
              data-testid="text-user-name"
            >
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email || "User"}
            </p>
            <p
              className="text-xs text-muted-foreground truncate"
              data-testid="text-user-email"
            >
              {user?.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-md border p-1">
          <Button
            variant={i18n.language.startsWith("en") ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => i18n.changeLanguage("en-CA")}
          >
            {t("language.en")}
          </Button>
          <Button
            variant={i18n.language.startsWith("fr") ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => i18n.changeLanguage("fr-CA")}
          >
            {t("language.fr")}
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          asChild
          data-testid="button-logout"
        >
          <a href="/api/logout">
            <LogOut className="mr-2 h-4 w-4" />
            {t("nav.signOut")}
          </a>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
