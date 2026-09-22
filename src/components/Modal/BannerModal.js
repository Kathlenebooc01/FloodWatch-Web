"use client"
import clsx from "clsx"
import GeneralCard from "../cards/GeneralCard"
import { motion } from "framer-motion"

export default function BannerModal({ className, children }) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-0 flex justify-center items-start pt-8 px-4 z-50 pointer-events-none"
    >
      <div className="pointer-events-auto w-full lg:max-w-lg max-w-sm">
        <GeneralCard className={clsx(' shadow-2xl', className)}>
          {children}
        </GeneralCard>
      </div>
    </motion.section>
  )
}
