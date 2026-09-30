"use client"
import React, { useState, useEffect } from 'react';
import GeneralCard from "@/components/cards/GeneralCard";
import CardSubHeader from "@/components/cards/CardSubHeader";
import { supabase } from "@/supabase/util/supabase";
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton";
import Link from 'next/link';

const ROLE_FORMATS = {
  national_admin: { label: "National Admin", color: "bg-purple-500" },
  provincial_admin: { label: "Provincial Admin", color: "bg-blue-500" },
  lgu_headmaster: { label: "Headmaster", color: "bg-orange-500" },
  lgu_frontliner: { label: "Frontliner", color: "bg-indigo-500" },
  citizen: { label: "Citizens", color: "bg-emerald-500" },
};

export default function RecentUsers() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      setIsLoading(true);
      const allowedRoles = ["citizen", "provincial_admin", "national_admin", "lgu_headmaster", "lgu_frontliner"];

      const { data, error } = await supabase
        .from('profiles')
        .select('*, province:province_id(name), municipality:municipality_id(name)')
        .in('role', allowedRoles)
        .order('created_at', { ascending: false })
        .limit(4);

      if (data) {
        setUsers(data);
      }
      setIsLoading(false);
    }
    fetchUsers();

    // Setup Realtime subscription
    const channel = supabase
      .channel('recent-users-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusBadge = (is_verified) => {
    if (is_verified) {
      return <span className="bg-emerald-50 text-emerald-600 font-bold border border-emerald-100 px-2 py-0.5 rounded-full text-[10px]">Verified</span>;
    } else {
      // In a real app we might distinguish between Pending and Unverified based on other fields
      return <span className="bg-red-50 text-red-600 font-bold border border-red-100 px-2 py-0.5 rounded-full text-[10px]">Unverified</span>;
    }
  };
  
  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  return (
    <GeneralCard className="p-5 flex flex-col gap-4 bg-white border border-gray-100 rounded-xl shadow-sm h-full">
      <div className="flex justify-between items-center pb-2 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <CardSubHeader className="text-gray-800 font-bold text-sm !mb-0">Recently Registered Users</CardSubHeader>
        </div>
        <Link href="/national-admin/contributor" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
          View All Users
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-gray-400 font-bold tracking-wider border-b border-gray-50">
              <th className="pb-3 pt-1 uppercase">User</th>
              <th className="pb-3 pt-1 uppercase">Role</th>
              <th className="pb-3 pt-1 uppercase">Jurisdiction</th>
              <th className="pb-3 pt-1 uppercase text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="py-3 pr-2"><SingleLineSkeleton /></td>
                  <td className="py-3 px-2"><SingleLineSkeleton /></td>
                  <td className="py-3 px-2"><SingleLineSkeleton /></td>
                  <td className="py-3 pl-2"><div className="w-12 h-4 bg-gray-100 rounded inline-block float-right"></div></td>
                </tr>
              ))
            ) : users.length > 0 ? (
              users.map((user) => {
                const roleInfo = ROLE_FORMATS[user.role] || { label: "User", color: "bg-gray-500" };
                return (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-2">
                        {user.profile_picture ? (
                          <img src={user.profile_picture} alt="" className="w-7 h-7 rounded-full object-cover bg-gray-100" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {getInitials(user.full_name)}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-800 truncate max-w-[100px]">{user.full_name || "Unknown"}</div>
                          <div className="text-[9px] text-gray-400">{user.mobile_number || user.email || "N/A"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${roleInfo.color}`}></div>
                        <span className="font-medium text-gray-700 whitespace-nowrap">{roleInfo.label}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-gray-500 font-medium truncate max-w-[100px]">
                      {user.municipality?.name || user.province?.name || user.organization_name || "Independent"}
                    </td>
                    <td className="py-2.5 pl-2 text-right">
                      {getStatusBadge(user.is_verified)}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-6 text-gray-400">No recently registered users.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </GeneralCard>
  );
}
