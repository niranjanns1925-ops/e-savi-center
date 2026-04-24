import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, FileText, Bell, Shield, LifeBuoy, ChevronRight, User } from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  role: 'admin' | 'user';
  notificationCount?: number;
}

export default function Sidebar({ role, notificationCount }: SidebarProps) {
  const menuItems = role === 'admin' ? [
    { icon: <LayoutGrid className="w-5 h-5" />, label: 'Overview', path: '/admin' },
    { icon: <FileText className="w-5 h-5" />, label: 'Services', path: '/admin/services' },
    { icon: <Bell className="w-5 h-5" />, label: 'Notifications', path: '/admin/notifications', badge: notificationCount },
    { icon: <User className="w-5 h-5" />, label: 'Profile', path: '/profile' },
  ] : [
    { icon: <LayoutGrid className="w-5 h-5" />, label: 'All Services', path: '/user' },
    { icon: <FileText className="w-5 h-5" />, label: 'My Requests', path: '/user/requests' },
    { icon: <Bell className="w-5 h-5" />, label: 'Notifications', path: '/user/notifications', badge: notificationCount },
    { icon: <User className="w-5 h-5" />, label: 'Profile', path: '/profile' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col h-[calc(100vh-4rem)] sticky top-16">
      <div className="p-6 flex-1 flex flex-col gap-2">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 px-3">
          Main Console
        </div>
        
        {menuItems.map((item, idx) => (
          <NavLink
            key={idx}
            to={item.path}
            end={item.path === '/user' || item.path === '/admin'}
            className={({ isActive }) => `
              flex items-center justify-between group px-4 py-3 rounded-xl font-semibold transition-all duration-200
              ${isActive 
                ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
            `}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <span className="text-sm">{item.label}</span>
            </div>
            {item.badge ? (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center">
                {item.badge}
              </span>
            ) : (
              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </NavLink>
        ))}

        <div className="mt-auto pt-6">
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-100"
          >
            <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Need Assistance?</p>
            <p className="text-sm font-bold mb-4 leading-tight">24/7 Service Support for Citizens</p>
            <button className="w-full py-2.5 bg-white/20 rounded-xl text-xs font-bold hover:bg-white/30 transition-all backdrop-blur-sm">
              Contact Helplines
            </button>
          </motion.div>
        </div>
      </div>
      
      <div className="p-6 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 opacity-60 grayscale hover:grayscale-0 transition-all">
          <Shield className="w-5 h-5 text-indigo-600" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Secure Core v2.4</span>
        </div>
      </div>
    </aside>
  );
}
