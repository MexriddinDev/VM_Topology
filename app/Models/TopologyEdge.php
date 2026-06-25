<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TopologyEdge extends Model
{
    protected $fillable = [
        'topology_id',
        'source_node_id',
        'target_node_id',
        'source_handle',
        'target_handle',
    ];

    protected $casts = [
        'topology_id' => 'integer',
        'source_node_id' => 'integer',
        'target_node_id' => 'integer',
    ];

    public function topology(): BelongsTo
    {
        return $this->belongsTo(Topology::class);
    }

    public function sourceNode(): BelongsTo
    {
        return $this->belongsTo(TopologyNode::class, 'source_node_id');
    }

    public function targetNode(): BelongsTo
    {
        return $this->belongsTo(TopologyNode::class, 'target_node_id');
    }
}
