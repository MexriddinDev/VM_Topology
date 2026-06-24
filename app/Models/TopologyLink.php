<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TopologyLink extends Model
{
    protected $fillable = [
        'source_topology_id',
        'target_topology_id',
        'source_server_id',
        'label',
    ];

    public function sourceTopology(): BelongsTo
    {
        return $this->belongsTo(Topology::class, 'source_topology_id');
    }

    public function targetTopology(): BelongsTo
    {
        return $this->belongsTo(Topology::class, 'target_topology_id');
    }
}
