<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class PrometheusController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }


    public function targets(): JsonResponse
    {
        $url = config('prometheus.url');

        try {

            $response = Http::timeout(config('prometheus.timeout', 5))
                ->get($url . '/api/v1/targets');

            if (!$response->successful()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Prometheus request failed',
                ], 500);
            }

            return response()->json([
                'success' => true,
                'data' => $response->json()['data']['activeTargets'] ?? [],
            ]);

        } catch (\Throwable $e) {

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);

        }
    }
}
