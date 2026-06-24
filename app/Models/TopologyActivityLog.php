<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TopologyActivityLog extends Model
{
    protected $fillable = [
        'topology_id',
        'action',
        'entity_type',
        'entity_id',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    public function topology(): BelongsTo
    {
        return $this->belongsTo(Topology::class);
    }
}
