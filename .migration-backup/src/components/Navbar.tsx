"use client";

import React from 'react';
import Link from 'next/link';
import { Video as LucideVideo, Github, Menu, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function Navbar() {
  return (
    <nav className="border-b border-white/5 bg-background/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 md:w-9 md:h-9 primary-gradient rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
            <LucideVideo className="w-4 h-4 md:w-5 md:h-5 text-background" />
          </div>
          <span className="text-lg md:text-xl font-headline font-bold text-gradient">VidCraft AI</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">Generator</Link>
          <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">Showcase</Link>
          <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">Pricing</Link>
          <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">Docs</Link>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <Button variant="ghost" size="icon" asChild className="text-muted-foreground hidden sm:inline-flex">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
              <Github className="w-4 h-4 md:w-5 md:h-5" />
            </a>
          </Button>
          
          <div className="h-6 w-px bg-white/10 mx-1 hidden lg:block" />
          
          <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2 h-8 text-xs">
            <User className="w-3.5 h-3.5" />
            Sign In
          </Button>
          
          <Button size="sm" className="primary-gradient text-background font-bold shadow-md hover:shadow-primary/20 h-8 md:h-9 px-3 md:px-4 text-xs md:text-sm gap-1.5">
            <Sparkles className="w-3 h-3 md:hidden" />
            <span className="hidden xs:inline">Get Pro</span>
            <span className="xs:hidden">Pro</span>
          </Button>

          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass-morphism p-2">
                <DropdownMenuItem className="rounded-lg h-10">Generator</DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg h-10">Showcase</DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg h-10">Pricing</DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg h-10">Docs</DropdownMenuItem>
                <div className="h-px bg-white/5 my-1 md:hidden" />
                <DropdownMenuItem className="rounded-lg h-10 sm:hidden">Sign In</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
