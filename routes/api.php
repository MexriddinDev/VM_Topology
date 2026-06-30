<?php

use App\Http\Controllers\PrometheusController;
use App\Http\Controllers\ServerController;
use App\Http\Controllers\TopologyController;
use App\Http\Controllers\AlertController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware(['throttle:120,1'])->group(function () {
    Route::get('/servers', [ServerController::class, 'index']);
    Route::get('/server/{id}/metrics', [ServerController::class, 'metrics']);

    Route::get('/topologies', [TopologyController::class, 'index']);
    Route::post('/topologies', [TopologyController::class, 'store']);


    Route::get('/prometheus/targets', [PrometheusController::class, 'targets']);

    Route::get('/topology/{id?}', [TopologyController::class, 'show']);
    Route::put('/topology/{id}', [TopologyController::class, 'updateMeta']);
    Route::delete('/topology/{id}', [TopologyController::class, 'destroy']);
    Route::post('/topology/{id}/save', [TopologyController::class, 'save']);

    Route::post('/topology/{id}/nodes', [TopologyController::class, 'addNode']);
    Route::delete('/topology/{id}/nodes/{serverId}', [TopologyController::class, 'removeNode']);

    Route::post('/topology/{id}/links', [TopologyController::class, 'linkDashboard']);
    Route::delete('/topology/links/{linkId}', [TopologyController::class, 'unlinkDashboard']);

    // Legacy routes
    Route::post('/topology/save', [TopologyController::class, 'save']);

    Route::get('/alerts', [AlertController::class, 'index']);
});
