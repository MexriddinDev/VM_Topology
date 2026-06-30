@extends('layouts.auth')

@section('content')
    <div class="flex min-h-screen items-center justify-center px-4 py-10">
        <div class="w-full max-w-md rounded-3xl border border-slate-700 bg-[#0b1220] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div class="flex items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 shadow-[0_0_20px_rgba(56,189,248,.35)]">
                    <span class="text-lg font-black">⧉</span>
                </div>
                <div>
                    <div class="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-400">Infra</div>
                    <h1 class="text-2xl font-black">Register</h1>
                </div>
            </div>

            <p class="mt-4 text-sm text-slate-400">Yangi hisob ochib panelga kiring.</p>

            <form method="post" action="{{ route('register') }}" class="mt-8 space-y-4">
                @csrf
                <div>
                    <label class="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Name</label>
                    <input name="name" value="{{ old('name') }}" type="text" required
                           class="w-full rounded-2xl border border-slate-700 bg-[#111827] px-4 py-3 text-white outline-none focus:border-cyan-400"
                           placeholder="Your name">
                    @error('name')<div class="mt-2 text-sm text-red-400">{{ $message }}</div>@enderror
                </div>

                <div>
                    <label class="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Email</label>
                    <input name="email" value="{{ old('email') }}" type="email" required
                           class="w-full rounded-2xl border border-slate-700 bg-[#111827] px-4 py-3 text-white outline-none focus:border-cyan-400"
                           placeholder="you@example.com">
                    @error('email')<div class="mt-2 text-sm text-red-400">{{ $message }}</div>@enderror
                </div>

                <div>
                    <label class="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Password</label>
                    <input name="password" type="password" required
                           class="w-full rounded-2xl border border-slate-700 bg-[#111827] px-4 py-3 text-white outline-none focus:border-cyan-400"
                           placeholder="••••••••">
                    @error('password')<div class="mt-2 text-sm text-red-400">{{ $message }}</div>@enderror
                </div>

                <div>
                    <label class="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Confirm Password</label>
                    <input name="password_confirmation" type="password" required
                           class="w-full rounded-2xl border border-slate-700 bg-[#111827] px-4 py-3 text-white outline-none focus:border-cyan-400"
                           placeholder="••••••••">
                </div>

                <button type="submit" class="w-full rounded-2xl bg-cyan-500 px-4 py-3.5 text-sm font-black uppercase tracking-[0.25em] text-[#06111f]">
                    Create account
                </button>
            </form>

            <div class="mt-6 text-sm text-slate-400">
                Already have an account?
                <a href="{{ route('login') }}" class="font-bold text-cyan-400 hover:text-cyan-300">Login</a>
            </div>
        </div>
    </div>
@endsection
