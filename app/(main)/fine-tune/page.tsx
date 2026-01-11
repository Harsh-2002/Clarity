import { Suspense } from "react"
import { FinetunedPageContent } from "@/components/fine-tune/finetune-page-content"

export default function FinetunePage() {
  return (
    <main className="min-h-screen bg-background">
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <FinetunedPageContent />
      </Suspense>
    </main>
  )
}
