<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TopologyNode extends Model
{
    protected $fillable = [
        'topology_id',
        'server_id',
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
}
