"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Loader2, ArrowRight } from "lucide-react"
import { setAccessToken } from "@/lib/storage"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await fetch("/api/v1/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            })

            if (!res.ok) {
                throw new Error("Invalid credentials")
            }

            const data = await res.json()
            setAccessToken(data.accessToken)

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
                        <h1 className="text-3xl font-medium tracking-tight bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
                            Welcome Back
                        </h1>
                        <p className="text-sm text-muted-foreground tracking-widest uppercase text-[10px]">
                            Verify Your Identity
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-3">
                            <Input
                                id="username"
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Username"
                                className="h-12 bg-muted/20 border-transparent hover:bg-muted/30 focus:border-foreground/20 focus:ring-0 focus:bg-background transition-all text-center placeholder:text-muted-foreground/50 tracking-wide"
                            />
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className="h-12 bg-muted/20 border-transparent hover:bg-muted/30 focus:border-foreground/20 focus:ring-0 focus:bg-background transition-all text-center placeholder:text-muted-foreground/50 tracking-wide"
                            />
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
                                    Sign In <ArrowRight className="w-4 h-4" />
                                </span>
                            )}
                        </Button>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}
