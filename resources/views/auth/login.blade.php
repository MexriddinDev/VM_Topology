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
                    <h1 class="text-2xl font-black">Login</h1>
                </div>
            </div>

            <p class="mt-4 text-sm text-slate-400">Topologiya paneliga kirish uchun login qiling.</p>

            <form method="post" action="{{ route('login') }}" class="mt-8 space-y-4">
                @csrf
                <div>
                    <label class="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Email</label>
                    <input name="email" value="{{ old('email') }}" type="email" required
                           class="w-full rounded-2xl border border-slate-700 bg-[#111827] px-4 py-3 text-white outline-none focus:border-cyan-400"
                           placeholder="you@example.com">
                    @error('email')<div class="mt-2 text-sm text-red-400">{{ $message }}</div>@enderror
                </div>

                <div>
                    <label class="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Parol</label>
                    <input name="password" type="password" required
                           class="w-full rounded-2xl border border-slate-700 bg-[#111827] px-4 py-3 text-white outline-none focus:border-cyan-400"
                           placeholder="••••••••">
                    @error('password')<div class="mt-2 text-sm text-red-400">{{ $message }}</div>@enderror
                </div>

                <label class="flex items-center gap-2 text-sm text-slate-400">
                    <input type="checkbox" name="remember" class="rounded border-slate-600 bg-[#111827] text-cyan-500">
                    Remember me
                </label>

                <button type="submit" class="w-full rounded-2xl bg-cyan-500 px-4 py-3.5 text-sm font-black uppercase tracking-[0.25em] text-[#06111f]">
                    Kirish
                </button>
            </form>

            <div class="mt-6 text-sm text-slate-400">
                Hisob yo‘qmi?
                <a href="{{ route('register') }}" class="font-bold text-cyan-400 hover:text-cyan-300">Register</a>
            </div>
        </div>
    </div>
@endsection
