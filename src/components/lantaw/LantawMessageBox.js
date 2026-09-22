"use client"
import { memo, useRef, useMemo } from "react"
import { Origami } from "lucide-react"
import ReactMarkdown from "react-markdown"
import useTypewriter from "./TypewriterText"
import useOnScreen from "@/hooks/useOnScreen"
import LantawVisualization from "./LantawVisualization"
import LantawDocumentCard from "./LantawDocumentCard"
import LantawSheetCard from "./LantawSheetCard"

function LantawMessageBox({ children, isNew = false }) {
  const ref = useRef(null)
  const isVisible = useOnScreen(ref, { rootMargin: '200px' })

  // Intercept and parse JSON data (visualization, document config, spreadsheet)
  const parsedData = useMemo(() => {
    if (typeof children !== 'string') return null
    try {
      // First, check if there's a JSON block at the top (used for documents and charts)
      const match = children.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      let jsonStr = ""
      let remainingText = children

      if (match) {
        jsonStr = match[1].trim()
        remainingText = children.replace(match[0], '').trim()
      } else {
        // Fallback for when AI doesn't wrap with backticks
        const startIdx = children.indexOf('{')
        if (startIdx !== -1) {
          let braceCount = 0;
          let endIdx = -1;
          let inString = false;
          let escape = false;
          for (let i = startIdx; i < children.length; i++) {
            const char = children[i];
            if (char === '"' && !escape) inString = !inString;
            if (char === '\\' && !escape) escape = true;
            else escape = false;

            if (!inString) {
              if (char === '{') braceCount++;
              if (char === '}') braceCount--;
            }

            if (braceCount === 0 && char === '}') {
              endIdx = i;
              break;
            }
          }
          if (endIdx !== -1) {
            jsonStr = children.substring(startIdx, endIdx + 1)
            remainingText = children.substring(0, startIdx) + children.substring(endIdx + 1)
            remainingText = remainingText.trim()
          }
        }
      }

      if (!jsonStr) return null

      // Fix common LLM JSON error: literal newlines/tabs inside strings
      let isInsideString = false;
      let isEscaped = false;
      let sanitized = '';
      for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        if (char === '"' && !isEscaped) {
          isInsideString = !isInsideString;
          sanitized += char;
        } else if (char === '\\') {
          isEscaped = !isEscaped;
          sanitized += char;
        } else {
          isEscaped = false;
          if (isInsideString) {
            if (char === '\n') sanitized += '\\n';
            else if (char === '\r') sanitized += '\\r';
            else if (char === '\t') sanitized += '\\t';
            else sanitized += char;
          } else {
            sanitized += char;
          }
        }
      }

      const parsed = JSON.parse(sanitized)
      if (parsed && parsed.visualization) {
        return { type: 'visualization', data: parsed }
      }
      if (parsed && parsed.document === true) {
        // Attach the rest of the message as the markdown content for the document
        parsed.content = remainingText
        return { type: 'document', data: parsed }
      }
      if (parsed && parsed.spreadsheet === true) {
        return { type: 'spreadsheet', data: parsed }
      }
    } catch (e) {
      return null
    }
    return null
  }, [children])

  return (
    <section ref={ref} className="flex items-start gap-2 w-full min-w-0 overflow-hidden">
        <div className="summary-data-icon mt-1 shrink-0">
            <Origami className="size-4"/>
        </div>
        <div className="text-sm text-slate-700 leading-relaxed lantaw-prose w-full min-w-0 overflow-hidden break-words">
            {parsedData?.type === 'visualization' ? (
                <LantawVisualization data={parsedData.data} />
            ) : parsedData?.type === 'document' ? (
                <LantawDocumentCard data={parsedData.data} />
            ) : parsedData?.type === 'spreadsheet' ? (
                <LantawSheetCard data={parsedData.data} />
            ) : isNew ? (
                <TypewriterMarkdown text={children} />
            ) : isVisible ? (
                <ReactMarkdown>{children}</ReactMarkdown>
            ) : (
                <PlainPreview text={children} />
            )}
        </div>
    </section>
  )
}


// Memoize to prevent re-renders when parent state changes but this message hasn't
export default memo(LantawMessageBox)

function TypewriterMarkdown({ text }) {
  const { displayedText } = useTypewriter(text, 15)
  return <ReactMarkdown>{displayedText}</ReactMarkdown>
}

// Lightweight plain-text preview for off-screen messages (no markdown parsing)
function PlainPreview({ text }) {
  const preview = text.length > 120 ? text.slice(0, 120) + "..." : text
  return <p className="text-slate-400">{preview}</p>
}
