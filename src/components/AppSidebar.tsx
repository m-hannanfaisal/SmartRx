import { LayoutDashboard, Users, FileText, Stethoscope, Pill, LogOut, Activity, UserCog, MessageCircle, Cpu } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { getDoctorUnreadCount } from '@/lib/store';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';

const menuItems = [
  { title: 'Dashboard',     url: '/dashboard',     icon: LayoutDashboard },
  { title: 'Patients',      url: '/patients',      icon: Users            },
  { title: 'Prescriptions', url: '/prescriptions', icon: FileText         },
  { title: 'Messages',      url: '/messages',      icon: MessageCircle    },
  { title: 'Templates',     url: '/templates',     icon: Stethoscope      },
  { title: 'Medicines',     url: '/medicines',     icon: Pill             },
  { title: 'My Profile',    url: '/profile',       icon: UserCog          },
  { title: 'Advanced DB',   url: '/advanced',      icon: Cpu              },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location  = useLocation();
  const navigate  = useNavigate();
  const { clearAuth, token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  // Fetch unread count periodically
  useEffect(() => {
    if (!token) return;

    const fetchUnread = async () => {
      const count = await getDoctorUnreadCount();
      setUnreadCount(count);
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 20000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <div className="px-3 py-5">
            {!collapsed ? (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl medical-gradient flex items-center justify-center shadow-lg">
                  <Activity className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <span className="font-bold text-sm text-sidebar-primary-foreground tracking-tight">SmartRx</span>
                  <p className="text-[10px] text-sidebar-foreground/60 leading-none mt-0.5">Digital Prescriptions</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="h-9 w-9 rounded-xl medical-gradient flex items-center justify-center shadow-lg">
                  <Activity className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname.startsWith(item.url)}>
                    <NavLink
                      to={item.url}
                      end={item.url === '/dashboard'}
                      className="hover:bg-sidebar-accent rounded-lg transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <div className="relative mr-2">
                        <item.icon className="h-4 w-4" />
                        {item.url === '/messages' && unreadCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none animate-pulse">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                      {!collapsed && (
                        <span className="text-[13px] flex items-center gap-2">
                          {item.title}
                          {item.url === '/messages' && unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                              {unreadCount}
                            </span>
                          )}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span className="text-[13px]">Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
