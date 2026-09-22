"use client"

import { useState } from "react"
import UserLogsSummary from "@/components/logs/UserLogsSummary"
import UserLogsTable from "@/components/logs/UserLogsTable"
import ModalInfor from "./ModalInfor"

export default function UserLogs() {
  const [selectedLog, setSelectedLog] = useState(null)

  return (
    <section className="grid gap-5">
      <UserLogsSummary/>
      <UserLogsTable onSelectLog={setSelectedLog}/>
      <ModalInfor log={selectedLog} onClose={() => setSelectedLog(null)} />
    </section>
  )
}