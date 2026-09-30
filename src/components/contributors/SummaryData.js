"use client"
import { useState, useEffect } from "react"
import GeneralCard from "../cards/GeneralCard"
import CardHeader from "../cards/CardHeader"
import CardBasedText from "../cards/CardBasedText"
import { supabase } from "@/supabase/util/supabase"

export default function SummaryData() {
  const [counts, setCounts] = useState({
    total: 0,
    accepted: 0,
    pending: 0,
    expired: 0,
    provinces: 0,
    municipalities: 0,
  });

  useEffect(() => {
    async function fetchCounts() {
      const [totalRes, acceptedRes, pendingRes, expiredRes, provinceRes, municipalityRes] = await Promise.all([
        supabase.from('invitations').select('*', { count: 'exact', head: true }),
        supabase.from('invitations').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
        supabase.from('invitations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('invitations').select('*', { count: 'exact', head: true }).eq('status', 'expired'),
        supabase.from('province').select('*', { count: 'exact', head: true }),
        supabase.from('municipality_or_city').select('*', { count: 'exact', head: true })
      ]);

      setCounts({
        total: totalRes.count || 0,
        accepted: acceptedRes.count || 0,
        pending: pendingRes.count || 0,
        expired: expiredRes.count || 0,
        provinces: provinceRes.count || 0,
        municipalities: municipalityRes.count || 0,
      });
    }

    fetchCounts();

    // Setup Realtime subscriptions
    const channel1 = supabase
      .channel('invitations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations' }, () => {
        fetchCounts();
      })
      .subscribe();

    const channel2 = supabase
      .channel('locations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'province' }, () => {
        fetchCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'municipality_or_city' }, () => {
        fetchCounts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, []);

  const acceptedRate = counts.total > 0 ? Math.round((counts.accepted / counts.total) * 100) : 0;

  return (
    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <GeneralCard className="grid gap-5 p-5 bg-white border border-gray-100 rounded-xl shadow-sm">
            <CardBasedText className="text-gray-500 font-semibold text-sm">Total Invited Accounts</CardBasedText>
            <div className="flex items-center justify-between">
            <CardHeader className="text-3xl text-gray-800">{counts.total}</CardHeader>
            <CardBasedText className="default-banner text-xs font-semibold bg-blue-50 text-blue-600 px-2 py-1 rounded-md">Total Invites</CardBasedText>
            </div>
        </GeneralCard>
        
        <GeneralCard className="grid gap-5 p-5 bg-white border border-gray-100 rounded-xl shadow-sm">
            <CardBasedText className="text-gray-500 font-semibold text-sm">Accepted Invitations</CardBasedText>
            <div className="flex items-center justify-between">
            <CardHeader className="text-3xl text-gray-800">{counts.accepted}</CardHeader>
            <CardBasedText className="default-banner-green text-xs font-semibold bg-green-50 text-green-600 px-2 py-1 rounded-md">{acceptedRate}% Rate</CardBasedText>
            </div>
        </GeneralCard>
        
        <GeneralCard className="grid gap-5 p-5 bg-white border border-gray-100 rounded-xl shadow-sm">
            <CardBasedText className="text-gray-500 font-semibold text-sm">Pending Invitations</CardBasedText>
            <div className="flex items-center justify-between">
            <CardHeader className="text-3xl text-gray-800">{counts.pending}</CardHeader>
            <CardBasedText className="default-banner-amber text-xs font-semibold bg-amber-50 text-amber-600 px-2 py-1 rounded-md">Action Required</CardBasedText>
            </div>
        </GeneralCard>

        <GeneralCard className="grid gap-5 p-5 bg-white border border-gray-100 rounded-xl shadow-sm">
            <CardBasedText className="text-gray-500 font-semibold text-sm">Expired Invitations</CardBasedText>
            <div className="flex items-center justify-between">
            <CardHeader className="text-3xl text-gray-800">{counts.expired}</CardHeader>
            <CardBasedText className="default-banner-red text-xs font-semibold bg-red-50 text-red-600 px-2 py-1 rounded-md">Expired</CardBasedText>
            </div>
        </GeneralCard>

        <GeneralCard className="grid gap-5 p-5 bg-white border border-gray-100 rounded-xl shadow-sm">
            <CardBasedText className="text-gray-500 font-semibold text-sm">Total Provinces</CardBasedText>
            <div className="flex items-center justify-between">
            <CardHeader className="text-3xl text-gray-800">{counts.provinces}</CardHeader>
            <CardBasedText className="default-banner text-xs font-semibold bg-blue-50 text-blue-600 px-2 py-1 rounded-md">Coverage</CardBasedText>
            </div>
        </GeneralCard>

        <GeneralCard className="grid gap-5 p-5 bg-white border border-gray-100 rounded-xl shadow-sm">
            <CardBasedText className="text-gray-500 font-semibold text-sm">Total Municipalities</CardBasedText>
            <div className="flex items-center justify-between">
            <CardHeader className="text-3xl text-gray-800">{counts.municipalities.toLocaleString()}</CardHeader>
            <CardBasedText className="default-banner text-xs font-semibold bg-blue-50 text-blue-600 px-2 py-1 rounded-md">Active</CardBasedText>
            </div>
        </GeneralCard>
    </section>
  )
}