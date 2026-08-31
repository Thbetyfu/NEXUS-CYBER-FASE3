"use client"

import React, { useState } from "react"
import { Globe, Shield, X, Plus, Loader2 } from "lucide-react"
import { gatewayURL } from '@/config'
import { z } from "zod"

const routeSchema = z.object({
    domain: z.string().regex(/^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})*(:\d+)?$/, {
        message: "Invalid domain format (e.g. portfolio.nexus-lab.test)",
    }),
    targetUrl: z.string().url({ message: "Invalid origin URL (e.g. https://site.vercel.app)" }),
})

interface AddRouteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

/** Domain Switcher add-route — manual origin only. No Docker auto-provision (Cowork pilot). */
export default function AddRouteModal({ isOpen, onClose, onSuccess }: AddRouteModalProps) {
    const [domain, setDomain] = useState("")
    const [targetUrl, setTargetUrl] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError(null)

        const validationResult = routeSchema.safeParse({ domain, targetUrl })
        if (!validationResult.success) {
            setError(validationResult.error.issues[0].message)
            setIsSubmitting(false)
            return
        }

        try {
            const tokenRes = await fetch(gatewayURL("/api/csrf-token"), { credentials: "include" })
            const { csrf_token } = tokenRes.ok ? await tokenRes.json() : { csrf_token: "" }

            const res = await fetch(gatewayURL("/api/routes"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(csrf_token ? { "X-CSRF-Token": csrf_token } : {})
                },
                credentials: "include",
                body: JSON.stringify({ domain, target_url: targetUrl.trim() }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.message || "Failed to add route")
            }

            setDomain("")
            setTargetUrl("")
            onSuccess()
            onClose()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative w-full max-w-md bg-[#0a0c10] border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-slate-900/50 p-6 border-b border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-teal-500/10 p-2 rounded-lg border border-teal-500/20">
                            <Shield className="w-5 h-5 text-teal-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-100">Daftar protected host</h2>
                            <p className="text-xs text-slate-500">Origin URL + host — DNS/tunnel di luar SOC</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-500 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                        Pilot operator (PC + tunnel). Bukan auto-provision Docker, bukan Midtrans /
                        CNAME massal. Prefer form Onboard di Operator GaaS Console.
                    </p>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                            Protected host / custom domain
                        </label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                required
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                                placeholder="portfolio.nexus-lab.test"
                                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 transition-all font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                            Origin URL
                        </label>
                        <input
                            type="url"
                            required
                            value={targetUrl}
                            onChange={(e) => setTargetUrl(e.target.value)}
                            placeholder="https://site-lama.vercel.app"
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 transition-all font-mono"
                        />
                        <p className="mt-1.5 text-[10px] text-slate-600 font-medium">
                            Hostname publik (Caddy/tunnel) dikonfigurasi di luar SOC.
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                            {error}
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-teal-700 hover:bg-teal-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-teal-900/30 flex items-center justify-center gap-2 group"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    Daftarkan lewat WAF
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
