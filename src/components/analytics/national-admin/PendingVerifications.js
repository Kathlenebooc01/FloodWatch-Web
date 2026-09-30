"use client"
import React, { useState, useEffect } from 'react';
import GeneralCard from "@/components/cards/GeneralCard";
import CardSubHeader from "@/components/cards/CardSubHeader";
import { supabase } from "@/supabase/util/supabase";
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton";
import Link from 'next/link';

export default function PendingVerifications() {
  const [verifications, setVerifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPending() {
      setIsLoading(true);
      // Fetch 4 most recent pending verifications
      const { data, error } = await supabase
        .from('id_verification')
        .select(`
          id_verification_id,
          id_type,
          submitted_at,
          status,
          user_id
        `)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false })
        .limit(4);

      if (data) {
        // Fetch profiles for names
        const userIds = data.map(v => v.user_id).filter(Boolean);
        if (userIds.length > 0) {
           const { data: profiles } = await supabase
             .from('profiles')
             .select('id, full_name')
             .in('id', userIds);
             
           const profileMap = {};
           if (profiles) {
             profiles.forEach(p => profileMap[p.id] = p.full_name);
           }
           
           const enrichedData = data.map(v => ({
             ...v,
             full_name: profileMap[v.user_id] || "Unknown User"
           }));
           setVerifications(enrichedData);
        } else {
           setVerifications(data);
        }
      }
      setIsLoading(false);
    }
    
    fetchPending();

    // Setup Realtime subscription
    const channel = supabase
      .channel('pending-verifications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'id_verification' }, () => {
        fetchPending();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let dayStr = "";
    if (date.toDateString() === today.toDateString()) {
      dayStr = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      dayStr = "Yesterday";
    } else {
      dayStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${dayStr}, ${timeStr}`;
  };

  return (
    <GeneralCard className="p-5 flex flex-col gap-4 bg-white border border-gray-100 rounded-xl shadow-sm h-full">
      <div className="flex justify-between items-center pb-2 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <CardSubHeader className="text-gray-800 font-bold text-sm !mb-0">Pending ID Verifications</CardSubHeader>
          <span className="bg-amber-50 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{verifications.length} Pending</span>
        </div>
        <Link href="/national-admin/id_verification" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
          Review All
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-gray-400 font-bold tracking-wider border-b border-gray-50">
              <th className="pb-3 pt-1 uppercase">Citizen ID & Name</th>
              <th className="pb-3 pt-1 uppercase">ID Type</th>
              <th className="pb-3 pt-1 uppercase">Submitted</th>
              <th className="pb-3 pt-1 uppercase text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="py-3 pr-2"><SingleLineSkeleton /></td>
                  <td className="py-3 px-2"><SingleLineSkeleton /></td>
                  <td className="py-3 px-2"><SingleLineSkeleton /></td>
                  <td className="py-3 pl-2 text-right"><div className="w-12 h-6 bg-gray-100 rounded inline-block"></div></td>
                </tr>
              ))
            ) : verifications.length > 0 ? (
              verifications.map((item) => (
                <tr key={item.id_verification_id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 pr-2">
                    <div className="font-semibold text-gray-800 truncate max-w-[120px]">{item.full_name || "Unknown"}</div>
                    <div className="text-[10px] text-gray-400">@CTZ-{item.user_id ? item.user_id.substring(0, 5) : "XXXX"}</div>
                  </td>
                  <td className="py-3 px-2">
                    <span className="bg-gray-50 text-gray-600 font-medium px-2 py-1 rounded-md text-[11px] whitespace-nowrap">
                      {item.id_type || "Unknown"}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-500">
                    {formatDate(item.submitted_at)}
                  </td>
                  <td className="py-3 pl-2 text-right">
                    <Link href="/national-admin/id_verification">
                      <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                        Verify
                      </button>
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-6 text-gray-400">No pending verifications.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </GeneralCard>
  );
}
