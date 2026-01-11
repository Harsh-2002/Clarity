"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, ArrowRight, RefreshCw, Copy, Check, Dices } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { setAccessToken } from "@/lib/storage"

export default function SetupPage() {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [copied, setCopied] = useState("")
    const router = useRouter()

    const generatePassword = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
        let newPassword = ""
        for (let i = 0; i < 16; i++) {
            newPassword += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        setPassword(newPassword)
    }

    const generateUsername = () => {
        const adjectives = ["Neon", "Solar", "Lunar", "Cyber", "Silent", "Velvet", "Rapid", "Grand", "Cosmic", "Dark"]
        const nouns = ["Pilot", "Spark", "Ghost", "Orbit", "Echo", "Flux", "Pulse", "Nomad", "Surfer", "Core"]

        const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
        const noun = nouns[Math.floor(Math.random() * nouns.length)]
        // Optional 2-digit suffix for "username" feel
        const num = Math.floor(Math.random() * 99).toString().padStart(2, "0")

        setUsername(`${adj}${noun}`)
    }

    const copyToClipboard = async (text: string, field: "password" | "username") => {
        if (!text) return
        await navigator.clipboard.writeText(text)
        setCopied(field)
        setTimeout(() => setCopied(""), 2000)
    }

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await fetch("/api/v1/auth/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || "Setup failed")
            }

            if (data.accessToken) {
                setAccessToken(data.accessToken)
            }

            router.push("/")
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background selection:bg-primary/20">
            <motion.div
                initial={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-sm"
            >
                <div className="space-y-8 text-center">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-medium tracking-tight">
                            Welcome to Clarity
                        </h1>
                        <p className="text-sm text-muted-foreground uppercase tracking-widest text-[10px]">
                            Turn noise into clarity.
                        </p>
                    </div>

                    <form onSubmit={handleSetup} className="space-y-6">
                        <div className="space-y-4">
                            {/* Username Field */}
                            <div className="relative group">
                                <Input
                                    id="username"
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Username or Email"
                                    className="h-12 bg-muted/20 border-transparent hover:bg-muted/30 focus:border-foreground/20 focus:ring-0 focus:bg-background transition-all placeholder:text-muted-foreground/50 tracking-wide text-center"
                                />
                                <div className="absolute inset-y-0 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={generateUsername}
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                        title="Generate Username"
                                    >
                                        <Dices className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="relative group">
                                <Input
                                    id="password"
                                    type="text"
                                    required
                                    minLength={8}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Secure Password"
                                    className="h-12 bg-muted/20 border-transparent hover:bg-muted/30 focus:border-foreground/20 focus:ring-0 focus:bg-background transition-all placeholder:text-muted-foreground/50 tracking-wide text-center font-mono text-sm"
                                />
                                <div className="absolute inset-y-0 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => copyToClipboard(password, "password")}
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                        title="Copy Password"
                                        disabled={!password}
                                    >
                                        {copied === "password" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={generatePassword}
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                        title="Generate Strong Password"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-destructive text-xs tracking-wide"
                            >
                                {error}
                            </motion.div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-12 rounded-full font-medium tracking-wide transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <span className="flex items-center gap-2">
                                    Create Account <ArrowRight className="w-4 h-4" />
                                </span>
                            )}
                        </Button>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}
