<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'Infra Topology') }}</title>
    @vite(['resources/css/index.css'])
</head>
<body class="min-h-screen bg-[#050814] text-white">
    <div class="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),transparent_35%),radial-gradient(circle_at_right,rgba(56,189,248,0.10),transparent_30%)]">
        @yield('content')
    </div>
</body>
</html>
