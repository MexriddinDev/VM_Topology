<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Topology extends Model
{
    protected $fillable = [
        'name',
        'description',
        'viewport_x',
        'viewport_y',
        'viewport_zoom',
        'is_default',
        'sort_order',
    ];

    protected $casts = [
        'viewport_x'    => 'float',
        'viewport_y'    => 'float',
        'viewport_zoom' => 'float',
        'is_default'    => 'boolean',
        'sort_order'    => 'integer',
    ];

    public function nodes(): HasMany
    {
        return $this->hasMany(TopologyNode::class);
    }

    public function edges(): HasMany
    {
        return $this->hasMany(TopologyEdge::class);
    }

    public function outgoingLinks(): HasMany
    {
        return $this->hasMany(TopologyLink::class, 'source_topology_id');
    }
}
