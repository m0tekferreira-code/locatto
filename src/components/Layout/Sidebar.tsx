import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Users,
  Receipt,
  BarChart3,
  Settings,
  UserCircle,
  ChevronRight,
  HelpCircle,
  LogOut,
  Calendar,
  Bell,
  Wallet,
  Shield,
  ClipboardCheck,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdminCheck } from "@/hooks/useSuperAdminCheck";
import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path?: string;
  submenu?: { label: string; path: string }[];
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  {
    icon: Building2,
    label: "Imóveis",
    submenu: [
      { label: "Listar imóveis", path: "/imoveis" },
      { label: "Cadastrar imóveis", path: "/imoveis/novo" },
    ],
  },
  { icon: Users, label: "Contatos", path: "/contatos" },
  { icon: FileText, label: "Documentos", path: "/documentos" },
  { icon: Calendar, label: "Visitas Agendadas", path: "/visitas" },
  { icon: ClipboardCheck, label: "Vistorias", path: "/vistorias" },
  { icon: Receipt, label: "Faturas", path: "/faturas" },
  {
    icon: Wallet,
    label: "Financeiro",
    submenu: [
      { label: "Dashboard", path: "/financeiro" },
      { label: "Baixa de Pagamentos", path: "/financeiro/baixa" },
      { label: "Importar Extrato", path: "/financeiro/importar-extrato" },
    ],
  },
  { icon: Bell, label: "Notificações", path: "/notificacoes" },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
  {
    icon: Settings,
    label: "Configurações",
    submenu: [
      { label: "Geral", path: "/configuracoes" },
      { label: "E-mail (SMTP)", path: "/configuracoes/email" },
      { label: "Webhooks", path: "/configuracoes/webhooks" },
      { label: "Portais Imobiliários", path: "/configuracoes/portais" },
      { label: "Meu Perfil", path: "/configuracoes/perfil" },
    ],
  },
  { icon: UserCircle, label: "Usuários", path: "/usuarios" },
];

const adminSubItems = [
  { label: "Dashboard", path: "/admin" },
  { label: "Contas", path: "/admin/accounts" },
  { label: "Pagamentos", path: "/admin/payments" },
  { label: "Usuários Admin", path: "/admin/users" },
  { label: "Planos", path: "/admin/plans" },
];

const CollapsibleMenuItem = ({
  item,
  isOpen,
  onToggle,
  pathname,
  sidebarOpen,
}: {
  item: MenuItem;
  isOpen: boolean;
  onToggle: () => void;
  pathname: string;
  sidebarOpen: boolean;
}) => {
  const Icon = item.icon;
  const isSubActive = item.submenu?.some((sub) => pathname === sub.path);

  if (!sidebarOpen) {
    return (
      <SidebarMenuItem>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuButton asChild isActive={isSubActive}>
              <Link to={item.submenu?.[0]?.path || "#"}>
                <Icon className="h-4 w-4" />
              </Link>
            </SidebarMenuButton>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex flex-col gap-1">
            <p className="font-medium">{item.label}</p>
            {item.submenu?.map((sub) => (
              <Link
                key={sub.path}
                to={sub.path}
                className={cn(
                  "text-xs hover:underline",
                  pathname === sub.path && "font-semibold"
                )}
              >
                {sub.label}
              </Link>
            ))}
          </TooltipContent>
        </Tooltip>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle} asChild>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={isSubActive} tooltip={item.label}>
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
            <ChevronRight
              className={cn(
                "ml-auto h-4 w-4 shrink-0 transition-transform duration-200",
                isOpen && "rotate-90"
              )}
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.submenu?.map((subItem) => (
              <SidebarMenuSubItem key={subItem.path}>
                <SidebarMenuSubButton asChild isActive={pathname === subItem.path}>
                  <Link to={subItem.path}>
                    <span>{subItem.label}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
};

export const Sidebar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isSuperAdmin } = useSuperAdminCheck();
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const { open } = useSidebar();

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const userName = user?.user_metadata?.full_name || "Usuário";
  const userEmail = user?.email || "";
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <SidebarUI collapsible="icon" variant="sidebar">
      {/* Logo */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-12 items-center gap-2 px-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          {open && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">Locatto</span>
              <span className="text-[10px] text-muted-foreground">Gestão Imobiliária</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Menu Principal */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;

                if (item.submenu) {
                  return (
                    <CollapsibleMenuItem
                      key={item.label}
                      item={item}
                      isOpen={openMenus.includes(item.label)}
                      onToggle={() => toggleMenu(item.label)}
                      pathname={location.pathname}
                      sidebarOpen={open}
                    />
                  );
                }

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.path} tooltip={item.label}>
                      <Link to={item.path!}>
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Super Admin Menu */}
        {isSuperAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Super Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <CollapsibleMenuItem
                    item={{
                      icon: Shield,
                      label: "Administração",
                      submenu: adminSubItems,
                    }}
                    isOpen={openMenus.includes("Super Admin")}
                    onToggle={() => toggleMenu("Super Admin")}
                    pathname={location.pathname}
                    sidebarOpen={open}
                  />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Footer com usuário */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Ajuda">
              <HelpCircle className="h-4 w-4" />
              <span>Ajuda</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        <div className="flex items-center gap-2 px-2 py-2">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {open && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium">{userName}</span>
              <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
            </div>
          )}
          {open && (
            <button
              onClick={signOut}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </SidebarFooter>

      <SidebarRail />
    </SidebarUI>
  );
};
