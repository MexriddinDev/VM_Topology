<?php

namespace App\Services;

use App\Models\Topology;
use App\Models\TopologyActivityLog;
use App\Models\TopologyEdge;
use App\Models\TopologyLink;
use App\Models\TopologyNode;
use Illuminate\Support\Facades\DB;

class TopologyService
{
    private function buildServerLookup(array $servers): array
    {
        $lookup = [
            'id' => [],
            'ip' => [],
            'instance' => [],
            'name' => [],
        ];

        foreach ($servers as $server) {
            if (!is_array($server)) {
                continue;
            }

            foreach (['id', 'ip', 'instance'] as $key) {
                if (!empty($server[$key])) {
                    $lookup[$key][(string) $server[$key]] = $server;
                }
            }

            foreach (['name', 'hostname', 'alias'] as $key) {
                if (!empty($server['labels'][$key])) {
                    $lookup['name'][mb_strtolower((string) $server['labels'][$key])] = $server;
                }
            }

            if (!empty($server['name'])) {
                $lookup['name'][mb_strtolower((string) $server['name'])] = $server;
            }
        }

        return $lookup;
    }

    private function resolveServer(array $lookup, string $serverId): ?array
    {
        if (isset($lookup['id'][$serverId])) {
            return $lookup['id'][$serverId];
        }

        if (isset($lookup['ip'][$serverId])) {
            return $lookup['ip'][$serverId];
        }

        if (isset($lookup['instance'][$serverId])) {
            return $lookup['instance'][$serverId];
        }

        $key = mb_strtolower($serverId);
        if (isset($lookup['name'][$key])) {
            return $lookup['name'][$key];
        }

        return null;
    }

    public function listAll(): array
    {
        return Topology::query()
            ->withCount(['nodes', 'edges'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (Topology $t) => $this->formatSummary($t))
            ->values()
            ->all();
    }

    public function findOrDefault(int $id = null): Topology
    {
        if ($id) {
            return Topology::query()->findOrFail($id);
        }

        $default = Topology::query()->where('is_default', true)->first();

        if ($default) {
            return $default;
        }

        return Topology::query()->orderBy('sort_order')->orderBy('id')->first()
            ?? $this->create(['name' => 'Main Topology', 'is_default' => true]);
    }

    public function create(array $data): Topology
    {
        $topology = Topology::create([
            'name'          => $data['name'] ?? 'New Topology',
            'description'   => $data['description'] ?? null,
            'viewport_x'    => $data['viewport_x'] ?? 0,
            'viewport_y'    => $data['viewport_y'] ?? 0,
            'viewport_zoom' => $data['viewport_zoom'] ?? 0.75,
            'is_default'    => (bool) ($data['is_default'] ?? false),
            'sort_order'    => $data['sort_order'] ?? (Topology::max('sort_order') + 1),
        ]);

        if ($topology->is_default) {
            Topology::query()
                ->where('id', '!=', $topology->id)
                ->update(['is_default' => false]);
        }

        return $topology;
    }

    public function update(int $id, array $data): Topology
    {
        $topology = Topology::query()->findOrFail($id);
        $topology->update(array_filter([
            'name'          => $data['name'] ?? null,
            'description'   => array_key_exists('description', $data) ? $data['description'] : null,
            'viewport_x'    => $data['viewport_x'] ?? null,
            'viewport_y'    => $data['viewport_y'] ?? null,
            'viewport_zoom' => $data['viewport_zoom'] ?? null,
            'sort_order'    => $data['sort_order'] ?? null,
        ], fn ($v) => $v !== null));

        if (!empty($data['is_default'])) {
            Topology::query()->where('id', '!=', $topology->id)->update(['is_default' => false]);
            $topology->update(['is_default' => true]);
        }

        return $topology->fresh();
    }

    public function delete(int $id): bool
    {
        $topology = Topology::query()->findOrFail($id);

        if (Topology::count() <= 1) {
            return false;
        }

        $wasDefault = $topology->is_default;
        $topology->delete();

        if ($wasDefault) {
            Topology::query()->orderBy('sort_order')->first()?->update(['is_default' => true]);
        }

        return true;
    }

    public function loadLayout(Topology $topology, array $servers): array
    {
        $topology->load(['nodes', 'edges', 'outgoingLinks.targetTopology']);

        $serverLookup = $this->buildServerLookup($servers);

        $nodes = $topology->nodes->map(function (TopologyNode $node) use ($serverLookup) {
            $live = $this->resolveServer($serverLookup, (string) $node->server_id);
            $displayName = $node->display_name ?: ($live['name'] ?? $node->server_id);

            $data = $live ?? [
                'id'          => $node->server_id,
                'name'        => $node->server_id,
                'instance'    => $node->server_id,
                'job'         => 'node',
                'type'        => 'vm',
                'status'      => 'down',
                'cpu_percent' => 0,
                'ram_percent' => 0,
                'ip'          => $node->server_id,
                'port'        => 9100,
                'labels'      => [],
                'layers'      => ['infra'],
            ];

            $data['name'] = $displayName;
            $data['display_name'] = $node->display_name;

            return [
                'id'       => $live['id'] ?? $node->server_id,
                'type'     => 'infraNode',
                'position' => [
                    'x' => $node->position_x,
                    'y' => $node->position_y,
                ],
                'data'     => $data,
            ];
        })->values()->all();

        $edges = $topology->edges->map(function (TopologyEdge $edge) use ($serverLookup) {
            $source = $this->resolveServer($serverLookup, (string) $edge->source_server_id);
            $target = $this->resolveServer($serverLookup, (string) $edge->target_server_id);

            return [
                'id'            => $edge->id,
                'source'        => $source['id'] ?? $edge->source_server_id,
                'target'        => $target['id'] ?? $edge->target_server_id,
                'sourceHandle'  => $edge->source_handle,
                'targetHandle'  => $edge->target_handle,
                'label'         => $edge->label,
                'animated'      => $edge->animated,
            ];
        })->values()->all();

        $links = $topology->outgoingLinks->map(fn (TopologyLink $link) => [
            'id'                 => $link->id,
            'target_topology_id' => $link->target_topology_id,
            'target_name'        => $link->targetTopology?->name,
            'source_server_id'   => $link->source_server_id,
            'label'              => $link->label,
        ])->values()->all();

        return [
            'topology' => $this->formatSummary($topology),
            'nodes'    => $nodes,
            'edges'    => $edges,
            'links'    => $links,
            'viewport' => [
                'x'    => $topology->viewport_x,
                'y'    => $topology->viewport_y,
                'zoom' => $topology->viewport_zoom,
            ],
        ];
    }

    public function saveLayout(Topology $topology, array $data, string $action = 'layout_saved'): bool
    {
        return DB::transaction(function () use ($topology, $data, $action) {
            if (isset($data['viewport'])) {
                $topology->update([
                    'viewport_x'    => $data['viewport']['x'] ?? 0,
                    'viewport_y'    => $data['viewport']['y'] ?? 0,
                    'viewport_zoom' => $data['viewport']['zoom'] ?? 0.75,
                ]);
            }

            $nodes = $data['nodes'] ?? [];
            $edges = $data['edges'] ?? [];

            $serverIds = collect($nodes)->pluck('id')->filter()->unique()->values()->all();

            TopologyNode::query()
                ->where('topology_id', $topology->id)
                ->whereNotIn('server_id', $serverIds)
                ->delete();

            foreach ($nodes as $node) {
                TopologyNode::query()->updateOrCreate(
                    [
                        'topology_id' => $topology->id,
                        'server_id'   => $node['id'],
                    ],
                    [
                        'display_name' => data_get($node, 'data.display_name'),
                        'position_x' => $node['position']['x'] ?? 0,
                        'position_y' => $node['position']['y'] ?? 0,
                    ]
                );
            }

            TopologyEdge::query()->where('topology_id', $topology->id)->delete();

            foreach ($edges as $edge) {
                TopologyEdge::create([
                    'id'                => $edge['id'] ?? uniqid('edge_'),
                    'topology_id'       => $topology->id,
                    'source_server_id'  => $edge['source'],
                    'target_server_id'  => $edge['target'],
                    'source_handle'     => $edge['sourceHandle'] ?? null,
                    'target_handle'     => $edge['targetHandle'] ?? null,
                    'label'             => $edge['label'] ?? null,
                    'animated'          => $edge['animated'] ?? true,
                ]);
            }

            $this->logActivity($topology->id, $action, 'layout', null, [
                'node_count'  => count($serverIds),
                'edge_count'  => count($edges),
                'viewport'    => $data['viewport'] ?? null,
            ]);

            return true;
        });
    }

    public function addNode(Topology $topology, string $serverId, array $position, ?string $displayName = null): TopologyNode
    {
        $node = TopologyNode::query()->firstOrCreate(
            [
                'topology_id' => $topology->id,
                'server_id'   => $serverId,
            ],
            [
                'display_name' => $displayName,
                'position_x' => $position['x'] ?? 100,
                'position_y' => $position['y'] ?? 100,
            ]
        );

        if ($displayName !== null) {
            $node->update(['display_name' => $displayName]);
        }

        $this->logActivity($topology->id, 'node_added', 'node', $serverId, [
            'position' => $position,
            'display_name' => $displayName,
        ]);

        return $node;
    }

    public function renameNode(Topology $topology, string $serverId, ?string $displayName): TopologyNode
    {
        $node = TopologyNode::query()
            ->where('topology_id', $topology->id)
            ->where('server_id', $serverId)
            ->firstOrFail();

        $node->update(['display_name' => $displayName]);

        $this->logActivity($topology->id, 'node_renamed', 'node', $serverId, [
            'display_name' => $displayName,
        ]);

        return $node;
    }

    public function removeNode(Topology $topology, string $serverId): void
    {
        TopologyNode::query()
            ->where('topology_id', $topology->id)
            ->where('server_id', $serverId)
            ->delete();

        TopologyEdge::query()
            ->where('topology_id', $topology->id)
            ->where(function ($q) use ($serverId) {
                $q->where('source_server_id', $serverId)
                    ->orWhere('target_server_id', $serverId);
            })
            ->delete();

        $this->logActivity($topology->id, 'node_removed', 'node', $serverId);
    }

    public function logActivity(int $topologyId, string $action, ?string $entityType = null, ?string $entityId = null, ?array $payload = null): void
    {
        TopologyActivityLog::create([
            'topology_id' => $topologyId,
            'action'      => $action,
            'entity_type' => $entityType,
            'entity_id'   => $entityId,
            'payload'     => $payload,
        ]);
    }

    public function linkTopologies(int $sourceId, int $targetId, ?string $sourceServerId = null, ?string $label = null): TopologyLink
    {
        return TopologyLink::query()->firstOrCreate(
            [
                'source_topology_id' => $sourceId,
                'target_topology_id' => $targetId,
                'source_server_id'   => $sourceServerId,
            ],
            ['label' => $label]
        );
    }

    public function unlinkTopologies(int $linkId): bool
    {
        return (bool) TopologyLink::query()->where('id', $linkId)->delete();
    }

    private function formatSummary(Topology $topology): array
    {
        return [
            'id'          => $topology->id,
            'name'        => $topology->name,
            'description' => $topology->description,
            'is_default'  => $topology->is_default,
            'sort_order'  => $topology->sort_order,
            'node_count'  => $topology->nodes_count ?? $topology->nodes()->count(),
            'edge_count'  => $topology->edges_count ?? $topology->edges()->count(),
            'updated_at'  => $topology->updated_at?->toIso8601String(),
        ];
    }
}
