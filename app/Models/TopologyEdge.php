<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TopologyEdge extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'topology_id',
        'source_server_id',
        'target_server_id',
        'source_handle',
        'target_handle',
        'label',
        'animated',
    ];

    protected $casts = [
        'animated' => 'boolean',
    ];

    public function topology(): BelongsTo
    {
        return $this->belongsTo(Topology::class);
    }
}
