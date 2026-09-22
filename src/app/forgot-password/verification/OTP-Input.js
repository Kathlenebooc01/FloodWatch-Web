"use client"

import { useRef } from "react"
import CardBasedText from "@/components/cards/CardBasedText"

export default function OTPInput({ value = "", onChange, disabled }) {
    const digits = Array.from({ length: 8 }, (_, i) => value[i] || "")
    const inputRefs = useRef([])

    const handleChange = (index, e) => {
        const val = e.target.value.replace(/\D/g, "") // only digits
        if (!val && !e.target.value) return

        const newDigits = [...digits]
        newDigits[index] = val.slice(-1) // take only last char
        const combined = newDigits.join("")
        if (onChange) onChange(combined.trim())

        // Auto-focus next input
        if (val && index < 7) {
            inputRefs.current[index + 1]?.focus()
        }
    }

    const handleKeyDown = (index, e) => {
        // Backspace: clear current and jump back
        if (e.key === "Backspace") {
            if (!digits[index] && index > 0) {
                const newDigits = [...digits]
                newDigits[index - 1] = ""
                const combined = newDigits.join("")
                if (onChange) onChange(combined.trim())
                inputRefs.current[index - 1]?.focus()
            } else {
                const newDigits = [...digits]
                newDigits[index] = ""
                const combined = newDigits.join("")
                if (onChange) onChange(combined.trim())
            }
        }
    }

    const handlePaste = (e) => {
        e.preventDefault()
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8)
        if (onChange) onChange(pasted)
        // Focus the input after the last pasted digit
        const focusIndex = Math.min(pasted.length, 7)
        inputRefs.current[focusIndex]?.focus()
    }

    return (
        <section className="grid gap-3 w-full">
            <CardBasedText className="text-gray-500">8 Digit OTP</CardBasedText>
            <div className="grid text-center w-full h-15 grid-cols-8 gap-3">
                {digits.map((digit, i) => (
                    <fieldset
                        key={i}
                        className={`input-layout transition-all duration-200 ${disabled ? 'bg-gray-100 border-gray-100 opacity-70 cursor-not-allowed' : ''}`}
                    >
                        <input
                            ref={(el) => (inputRefs.current[i] = el)}
                            type="tel"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit.trim()}
                            onChange={(e) => handleChange(i, e)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            onPaste={i === 0 ? handlePaste : undefined}
                            disabled={disabled}
                            className="outline-0 bg-transparent text-sm border-0 w-full flex-1 text-neutral-700 font-bold text-center disabled:text-gray-400 disabled:cursor-not-allowed"
                            autoComplete="one-time-code"
                        />
                    </fieldset>
                ))}
            </div>
        </section>
    )
}
