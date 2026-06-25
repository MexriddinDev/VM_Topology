<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TopologyNode extends Model
{
    protected $fillable = [
        'topology_id',
        'server_id',
        'server_name',
        'position_x',
        'position_y',
    ];

    protected $casts = [
        'position_x' => 'float',
        'position_y' => 'float',
    ];

    public function topology(): BelongsTo
    {
        return $this->belongsTo(Topology::class);
    }

    public function sourceEdges(): HasMany
    {
        return $this->hasMany(TopologyEdge::class, 'source_node_id');
    }

    public function targetEdges(): HasMany
    {
        return $this->hasMany(TopologyEdge::class, 'target_node_id');
    }
}

