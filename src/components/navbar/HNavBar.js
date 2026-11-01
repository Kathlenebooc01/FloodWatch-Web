"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import FloodWatchLogo from "@/assets/images/logofloodwatch.png";

export default function HNavBar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            // Apply the sticky styling once the user scrolls past 10px
            setIsScrolled(window.scrollY > 10);
        };

        window.addEventListener("scroll", handleScroll);
        handleScroll(); // Initial check

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav className={`horizontal-layout-navbar border-b border-slate-200/70 px-5 py-2.5 sm:px-8 ${isScrolled ? 'bg-white/95 shadow-sm backdrop-blur-md' : 'bg-white'}`}>
            <Link href="/" className="group flex items-center gap-3" aria-label="FloodWatch Cebu home">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-50 to-blue-100 ring-1 ring-blue-100 transition-transform group-hover:scale-105">
                    <Image src={FloodWatchLogo} alt="" width={39} height={39} className="h-10 w-10 object-contain" priority />
                </span>
                <span className="flex items-baseline gap-1 text-[17px] font-extrabold tracking-tight sm:text-xl">
                    <span className="text-[#063e91]">FloodWatch</span><span className="text-[#1685d7]">Cebu</span>
                </span>
            </Link>
            
            {/* Desktop Links */}
            <ul className="hidden md:flex gap-10">
                <li>
                    <Link href="#home" className="relative group text-gray-800 hover:text-primary transition-colors font-medium">
                        Home
                        <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                </li>
                <li>
                    <Link href="#download" className="relative group text-gray-800 hover:text-primary transition-colors font-medium">
                        Download
                        <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                </li>
                <li>
                    <Link href="#features" className="relative group text-gray-800 hover:text-primary transition-colors font-medium">
                        Features
                        <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                </li>
            </ul>
            
            {/* Desktop Sign In */}
            <div className="hidden md:block">
                <Link href='/login' className="btn-primary">Sign In</Link>
            </div>

            {/* Mobile Hamburger Button */}
            <button 
                className="md:hidden p-1 cursor-pointer text-primary"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle Mobile Menu"
            >
                {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>

            {/* Mobile Menu Dropdown (Animated) */}
            <div className={`
                absolute left-0 top-[110%] w-full bg-white/90 backdrop-blur-xl shadow-lg rounded-2xl border border-neutral-200
                transition-all duration-300 ease-in-out px-4 py-6 md:hidden
                ${isMobileMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-5 pointer-events-none'}
            `}>
                <ul className="flex flex-col gap-5 text-center items-center w-full">
                    <li className="w-full">
                        <Link href="#home" className="block w-full py-1 font-medium hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                    </li>
                    <li className="w-full">
                        <Link href="#download" className="block w-full py-1 font-medium hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Download</Link>
                    </li>
                    <li className="w-full">
                        <Link href="#features" className="block w-full py-1 font-medium hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Features</Link>
                    </li>
                    <li className="w-full pt-4 border-t border-gray-200">
                        <Link href='/login' className="btn-primary">Sign In</Link>
                    </li>
                </ul>
            </div>
        </nav>
    )
}
