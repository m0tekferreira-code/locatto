import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Users,
  Receipt,
  BarChart3,
  CreditCard,
  Settings,
  UserCircle,
  ChevronDown,
  HelpCircle,
  LogOut,
  Calendar,
  Bell,
  Wallet,
  Shield,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdminCheck } from "@/hooks/useSuperAdminCheck";
import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
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
      { label: "Portais Imobiliários", path: "/configuracoes/portais" },
    ],
  },
  { icon: UserCircle, label: "Usuários", path: "/usuarios" },
];

export const Sidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { isSuperAdmin } = useSuperAdminCheck();
  const [openMenus, setOpenMenus] = useState<string[]>(["Imóveis", "Super Admin", "Configurações", "Financeiro"]);
  const { open } = useSidebar();

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  return (
    <SidebarUI className="border-r bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Building2 className="h-6 w-6 text-primary" />
        {open && <span className="ml-2 text-lg font-semibold">Locatto</span>}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                if (item.submenu) {
                  const isOpen = openMenus.includes(item.label);
                  return (
                    <Collapsible key={item.label} open={isOpen} onOpenChange={() => toggleMenu(item.label)}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="w-full">
                          <Icon className="mr-3 h-4 w-4" />
                          {open && <span className="flex-1 text-left">{item.label}</span>}
                          {open && (
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform",
                                isOpen && "rotate-180"
                              )}
                            />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      {open && (
                        <CollapsibleContent className="space-y-1 pl-9 pt-1">
                          {item.submenu.map((subItem) => (
                            <SidebarMenuItem key={subItem.path}>
                              <SidebarMenuButton asChild isActive={location.pathname === subItem.path}>
                                <Link to={subItem.path}>
                                  <span className="text-sm">{subItem.label}</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.path}>
                        <Icon className="h-4 w-4" />
                        {open && <span>{item.label}</span>}
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
          <SidebarGroup>
            <SidebarGroupLabel>Super Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <Collapsible 
                  open={openMenus.includes("Super Admin")} 
                  onOpenChange={() => toggleMenu("Super Admin")}
                >
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="w-full">
                      <Shield className="mr-3 h-4 w-4 text-destructive" />
                      {open && <span className="flex-1 text-left">Administração</span>}
                      {open && (
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            openMenus.includes("Super Admin") && "rotate-180"
                          )}
                        />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  {open && (
                    <CollapsibleContent className="space-y-1 pl-9 pt-1">
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={location.pathname === "/admin"}>
                          <Link to="/admin">
                            <span className="text-sm">Dashboard</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={location.pathname === "/admin/accounts"}>
                          <Link to="/admin/accounts">
                            <span className="text-sm">Contas</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={location.pathname === "/admin/payments"}>
                          <Link to="/admin/payments">
                            <span className="text-sm">Pagamentos</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Bottom Actions */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <HelpCircle className="h-4 w-4" />
                  {open && <span>Ajuda?</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                  {open && <span>Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </SidebarUI>
  );
};
