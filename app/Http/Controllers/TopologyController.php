<?php

namespace App\Http\Controllers;

use App\Services\TopologyService;
use App\Services\PrometheusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class
TopologyController extends Controller
{
    public function __construct(
        private TopologyService $topology,
        private PrometheusService $prometheus
    ) {}

    /**
     * GET /api/v1/topologies
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $this->topology->listAll(),
        ]);
    }

    /**
     * POST /api/v1/topologies
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:120',
            'description' => 'nullable|string|max:500',
        ]);

        $topology = $this->topology->create($validated);

        return response()->json([
            'success' => true,
            'data'    => $topology,
        ], 201);
    }

    /**
     * GET /api/v1/topology/{id?}
     */
    public function show(?int $id = null): JsonResponse
    {
        $topology = $this->topology->findOrDefault($id);
        $servers  = $this->prometheus->buildVmList();
        $layout   = $this->topology->loadLayout($topology, $servers);

        return response()->json([
            'success' => true,
            'data'    => $layout,
        ]);
    }

    /**
     * PUT /api/v1/topology/{id}
     */
    public function updateMeta(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'name'        => 'sometimes|string|max:120',
            'description' => 'nullable|string|max:500',
            'is_default'  => 'sometimes|boolean',
        ]);

        $topology = $this->topology->update($id, $validated);

        return response()->json([
            'success' => true,
            'data'    => $topology,
        ]);
    }

    /**
     * DELETE /api/v1/topology/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $deleted = $this->topology->delete($id);

        return response()->json([
            'success' => $deleted,
            'message' => $deleted ? 'Topology deleted.' : 'Cannot delete the last topology.',
        ], $deleted ? 200 : 422);
    }

    /**
     * POST /api/v1/topology/{id}/save
     */
    public function save(Request $request, ?int $id = null): JsonResponse
    {
        $validated = $request->validate([
            'nodes'              => 'present|array',
            'edges'              => 'present|array',
            'viewport'           => 'sometimes|array',
            'viewport.x'         => 'sometimes|numeric',
            'viewport.y'         => 'sometimes|numeric',
            'viewport.zoom'      => 'sometimes|numeric',
            'action'             => 'sometimes|string|max:64',
        ]);

        $topology = $this->topology->findOrDefault($id);
        $action   = $validated['action'] ?? 'layout_saved';
        unset($validated['action']);
        $success  = $this->topology->saveLayout($topology, $validated, $action);

        return response()->json([
            'success' => $success,
            'message' => $success ? 'Topology saved.' : 'Failed to save topology.',
        ], $success ? 200 : 500);
    }

    /**
     * POST /api/v1/topology/{id}/nodes
     */
    public function addNode(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'server_id'   => 'required|string',
            'position.x'  => 'sometimes|numeric',
            'position.y'  => 'sometimes|numeric',
        ]);

        $topology = $this->topology->findOrDefault($id);
        $node     = $this->topology->addNode(
            $topology,
            $validated['server_id'],
            $validated['position'] ?? ['x' => 200, 'y' => 200]
        );

        return response()->json([
            'success' => true,
            'data'    => $node,
        ]);
    }

    /**
     * DELETE /api/v1/topology/{id}/nodes/{serverId}
     */
    public function removeNode(int $id, string $serverId): JsonResponse
    {
        $topology = $this->topology->findOrDefault($id);
        $this->topology->removeNode($topology, $serverId);

        return response()->json(['success' => true]);
    }

    /**
     * POST /api/v1/topology/{id}/links
     */
    public function linkDashboard(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'target_topology_id' => 'required|integer|exists:topologies,id',
            'source_server_id'   => 'nullable|string',
            'label'              => 'nullable|string|max:120',
        ]);

        $link = $this->topology->linkTopologies(
            $id,
            $validated['target_topology_id'],
            $validated['source_server_id'] ?? null,
            $validated['label'] ?? null
        );

        return response()->json(['success' => true, 'data' => $link]);
    }

    /**
     * DELETE /api/v1/topology/links/{linkId}
     */
    public function unlinkDashboard(int $linkId): JsonResponse
    {
        $deleted = $this->topology->unlinkTopologies($linkId);

        return response()->json(['success' => $deleted]);
    }
}
